import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl
} from "react-native";
import profileImg from "../../assets/appImages/lakshay-profile.jpg";
import { Image } from "react-native";

import { getMoodEntries } from "../storage/moodStorage";
import { getTodayActivity } from "../storage/activityStorage";

import { computeMoodScore7 } from "../logic/score";

import { useFocusEffect, useRouter } from "expo-router";

import StepTracker from "../components/StepTracker";
import HydrationTracker from "../components/HydrationTracker";
import SleepLogger from "../components/SleepLogger";

export default function DashboardScreen() {

  const router = useRouter();

  const [entries,setEntries] = useState([]);
  const [activity,setActivity] = useState({});
  const [refreshing,setRefreshing] = useState(false);

  const load = useCallback(async ()=>{

    const mood = await getMoodEntries();
    const act = await getTodayActivity();

    setEntries(mood);
    setActivity(act);

  },[]);

  useFocusEffect(
    useCallback(()=>{
      load();
    },[load])
  );

  const onRefresh = async()=>{
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date().toISOString().slice(0,10);

  const todayEntry = entries.find(e=>e.date===today);

  const moodText =
    todayEntry?.finalMood ||
    todayEntry?.predicted?.cls ||
    "—";

  const confText =
    todayEntry?.predicted?.conf != null
      ? `${Math.round(todayEntry.predicted.conf*100)}%`
      : "—";

  const {score} = computeMoodScore7(entries);

  return (

    <ScrollView
      style={{flex:1,backgroundColor:"#F2F4F7"}}
      contentContainerStyle={{padding:18}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
      }
    >

{/* HEADER */}

      <View style={{
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        marginBottom:18
      }}>

        <View>
          <Text style={{fontSize:28,fontWeight:"800"}}>
            Hi!
          </Text>

          <Text style={{color:"#777"}}>
            {today}
          </Text>
        </View>

        <Image
  source={profileImg}
  style={{
    width: 40,
    height: 40,
    borderRadius: 20,
  }}
/>
      </View>


{/* WELLNESS SCORE CARD */}

      <View style={{
        backgroundColor:"white",
        borderRadius:20,
        padding:20,
        marginBottom:20,
        shadowColor:"#000",
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
      }}>

        <Text style={{
          fontWeight:"700",
          marginBottom:10,
          color:"#444"
        }}>
          Wellness Score
        </Text>

        <View style={{
          flexDirection:"row",
          alignItems:"center",
          justifyContent:"space-between"
        }}>

          <View style={{
            flex:1,
            height:10,
            backgroundColor:"#E5E7EB",
            borderRadius:10,
            marginRight:12
          }}>

            <View style={{
              width:`${score || 0}%`,
              height:10,
              backgroundColor:"#10B981",
              borderRadius:10
            }}/>

          </View>

          <View style={{
            backgroundColor:"#10B981",
            paddingHorizontal:14,
            paddingVertical:6,
            borderRadius:10
          }}>

            <Text style={{
              color:"white",
              fontWeight:"800",
              fontSize:16
            }}>
              {score ?? "--"}
            </Text>

          </View>

        </View>

      </View>


{/* METRICS */}

      <View style={{
        flexDirection:"row",
        justifyContent:"space-between",
        marginBottom:22
      }}>

        <Metric title="Steps">
          <StepTracker todaySteps={activity.steps}/>
        </Metric>

        <Metric title="Sleep">
          <SleepLogger initial={activity.sleep}/>
        </Metric>

        <Metric title="Water">
          <HydrationTracker initial={activity.water}/>
        </Metric>

        <Metric title="Mood">
          <Text style={{fontWeight:"700"}}>
            {moodText}
          </Text>
        </Metric>

      </View>


{/* NEXT ACTION */}

      <View style={{
        backgroundColor:"white",
        borderRadius:18,
        padding:18,
        marginBottom:20,
        shadowColor:"#000",
        shadowOpacity:0.05,
        shadowRadius:8,
        elevation:2
      }}>

        <Text style={{
          fontWeight:"800",
          marginBottom:12
        }}>
          Next Best Action
        </Text>

        <View style={{
          backgroundColor:"#D1FAE5",
          padding:16,
          borderRadius:14
        }}>

          <Text style={{
            fontWeight:"800",
            fontSize:16
          }}>
            Drink 400ml water
          </Text>

          <Text style={{color:"#555"}}>
            Hydration improves energy
          </Text>

        </View>

      </View>


{/* CAPTURE MOOD BUTTON */}

      <Pressable
        onPress={()=>router.push("/mood")}
        style={{
          backgroundColor:"#10B981",
          padding:18,
          borderRadius:16,
          alignItems:"center",
          marginBottom:20
        }}
      >

        <Text style={{
          color:"white",
          fontWeight:"800",
          fontSize:16
        }}>
          Capture Mood
        </Text>

      </Pressable>


{/* MOOD CARD */}

      <View style={{
        backgroundColor:"white",
        borderRadius:18,
        padding:18
      }}>

        <Text style={{fontWeight:"800"}}>
          Today's Mood
        </Text>

        <Text style={{
          fontSize:24,
          fontWeight:"900",
          marginTop:6
        }}>
          {moodText}
        </Text>

        <Text style={{color:"#666"}}>
          Confidence: {confText}
        </Text>

      </View>

    </ScrollView>

  );
}


function Metric({title,children}){

  return(

    <View style={{
      width:"23%",
      backgroundColor:"white",
      padding:12,
      borderRadius:14,
      alignItems:"center",
      shadowColor:"#000",
      shadowOpacity:0.04,
      shadowRadius:6,
      elevation:1
    }}>

      <Text style={{
        fontSize:12,
        color:"#777",
        marginBottom:4
      }}>
        {title}
      </Text>

      {children}

    </View>

  );
}