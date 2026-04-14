import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mealsList = ["breakfast", "lunch", "dinner", "snacks"];

type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

interface FoodData {
  food: string;
  confidence?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export default function FoodScreen() {
  const [meals, setMeals] = useState<any>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });

  const [weeklyCalories, setWeeklyCalories] = useState<number>(0);



const fetchMeals = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    const res = await fetch("http://localhost:8000/activity", {
      headers: { token: token! },
    });
    console.log("TOKEN:", token);

    const json = await res.json();

    console.log("FETCHED:", json);

    const backendMeals = json?.data?.meals || {};

    
    setMeals({
      breakfast: backendMeals.breakfast || [],
      lunch: backendMeals.lunch || [],
      dinner: backendMeals.dinner || [],
      snacks: backendMeals.snacks || [],
    });

  } catch (err) {
    console.log("Fetch error:", err);
  }
};

  //  FETCH WEEKLY STATS
  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        "http://localhost:8000/activity/stats?days=7",
        {
          headers: { token: token! },
        }
      );

      const json = await res.json();

      const total = json.data.reduce(
        (sum: number, d: any) => sum + (d.calories || 0),
        0
      );

      setWeeklyCalories(total);
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchStats();
  }, []);

  //  FOOD PREDICTION
  const predictFood = async (uri: string) => {
    const formData = new FormData();
    const response = await fetch(uri);
    const blob = await response.blob();

    formData.append("image", blob, "food.jpg");

    const res = await fetch("http://localhost:8000/predict-food", {
      method: "POST",
      body: formData,
    });

    return await res.json();
  };

  //  SAVE FOOD TO BACKEND
  const saveFood = async (mealType: MealType, data: FoodData) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const payload = {
        date: today,
        mealType,
        food: {
          ...data,
          time,
        },
      };

      const token = await AsyncStorage.getItem("token");

      const res = await fetch("http://localhost:8000/activity/food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token!,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        console.log("Error:", json);
        return;
      }

      console.log("Saved ✅");

      
      await fetchMeals();
      await fetchStats();

    } catch (err) {
      console.log("Save error:", err);
    }
  };

  //  IMAGE HANDLER
  const handleImage = async (mealType: MealType, uri: string) => {
    const data = await predictFood(uri);

    if (data?.detail) {
      alert("Food detection failed ❌");
      return;
    }

    await saveFood(mealType, data);
  };

  //  PICK IMAGE
  const chooseSource = async (mealType: MealType) => {
    const res = await ImagePicker.launchImageLibraryAsync();

    if (!res.canceled) {
      handleImage(mealType, res.assets[0].uri);
    }
  };

  //  DAILY CALORIES
  const totalCalories = Object.values(meals).reduce(
    (sum: number, meal: any) =>
      sum +
      meal.reduce(
        (s: number, item: any) =>
          s + (item?.nutrition?.calories || 0),
        0
      ),
    0
  );

  const groupMeals = (items: any[]) => {
  const grouped: any = {};

  items.forEach((item) => {
    const key = item.food;

    if (!grouped[key]) {
      grouped[key] = {
        food: item.food,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
        lastTime: item.time,
      };
    }

    grouped[key].calories += item.nutrition?.calories ?? 0;
    grouped[key].protein += item.nutrition?.protein ?? 0;
    grouped[key].carbs += item.nutrition?.carbs ?? 0;
    grouped[key].fat += item.nutrition?.fat ?? 0;

    grouped[key].count += 1;
    grouped[key].lastTime = item.time;
  });

  return Object.values(grouped);
};

  return (
    
<ScrollView
      contentContainerStyle={{
        padding: 15,
        paddingBottom: 100, // 🔥 important for bottom spacing
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 10 }}>
        🍽️ Your Meals
      </Text>

      {/* DAILY */}
      <TouchableOpacity
        onPress={() => alert(`Today: ${totalCalories} kcal`)}
        style={{
          backgroundColor: "#2a8c82",
          padding: 14,
          borderRadius: 14,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
           Today: {totalCalories} kcal
        </Text>
      </TouchableOpacity>

      {/* WEEKLY */}
      <TouchableOpacity
        onPress={() => alert(`Last 7 days: ${weeklyCalories} kcal`)}
        style={{
          backgroundColor: "#6366F1",
          padding: 14,
          borderRadius: 14,
          marginBottom: 14,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
          📊 Weekly: {weeklyCalories} kcal
        </Text>
      </TouchableOpacity>

      {/* MEALS */}
      {mealsList.map((meal) => (
        <View
          key={meal}
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 14,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "800" }}>
              {meal.toUpperCase()}
            </Text>

            <TouchableOpacity
              onPress={() => chooseSource(meal as MealType)}
              style={{
                backgroundColor: "#2a8c82",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "#fff" }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {(meals[meal] || [])?.length === 0 ? (
            <Text style={{ color: "#9CA3AF", marginTop: 5 }}>
              No items
            </Text>
          ) : (
        
            groupMeals(meals[meal] || []).map((item: any, i: number) => (
  <View
    key={i}
    style={{
      marginTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 0.5,
      borderColor: "#E5E7EB",
    }}
  >
    <Text style={{ fontWeight: "700" }}>
      {item.food}
    </Text>

    <Text style={{ fontSize: 12, color: "#6B7280" }}>
       {item.calories} kcal • {item.count} times • {item.lastTime}
    </Text>

    <Text style={{ fontSize: 11, color: "#6B7280" }}>
      🥩 Protein: {item.protein}g | 🍞 Carbs: {item.carbs}g | 🧈 Fat: {item.fat}g
    </Text>
  </View>
))
          )}
        </View>
      ))}
    </ScrollView>
  );
}