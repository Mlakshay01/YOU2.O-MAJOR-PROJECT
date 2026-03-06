import React, { useState } from "react";
import { View, TextInput, Text } from "react-native";
import { saveMetric } from "../storage/activityStorage";

export default function SleepLogger({ initial }) {

  const [sleep,setSleep] = useState(initial || 0);

  const update = (v) => {

    const value = Number(v) || 0;
    setSleep(value);

    const today = new Date().toISOString().slice(0,10);
    saveMetric(today,"sleep",value);

  };

  return (

    <View>

      <TextInput
        value={String(sleep)}
        keyboardType="numeric"
        onChangeText={update}
        placeholder="hrs"
        style={{
          borderWidth:1,
          borderColor:"#ddd",
          padding:6,
          borderRadius:6
        }}
      />

    </View>

  );

}