import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { saveMetric } from "../storage/activityStorage";

export default function HydrationTracker({ initial }) {

  const [water,setWater] = useState(initial || 0);

  const add = (amount) => {

    const total = water + amount;
    setWater(total);

    const today = new Date().toISOString().slice(0,10);
    saveMetric(today,"water",total);

  };

  return (

    <View style={{alignItems:"center"}}>

      <Text style={{fontWeight:"900"}}>
        {water} ml
      </Text>

      <Pressable onPress={()=>add(250)}>
        <Text style={{color:"#0F766E"}}>+250</Text>
      </Pressable>

    </View>

  );

}