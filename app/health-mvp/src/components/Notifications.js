// import { Platform } from "react-native";
// import * as Notifications from "expo-notifications";



// export const sendHydrationReminder = async () => {
//   if (Platform.OS === "web") {
//     //  fallback for web
//     alert("💧 Time to hydrate!");
//     return;
//   }

//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "💧 Quick assess: How much water have you had today?",
//       body: " Tap to log a drink or ignore to dismiss.",
//       data: { type: "hydration" },
//       categoryIdentifier: "hydration",
//     },
//     trigger: null,
//   });
// };

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// let categorySet = false;

export const sendHydrationReminder = async () => {
  if (Platform.OS === "web") {
    alert("💧 Time to hydrate!");
    return;
  }

  //  Register buttons (only once)
  Notifications.setNotificationCategoryAsync("hydration", [
  {
    identifier: "ADD_150",
    buttonTitle: "+150 ml",
    options: { opensAppToForeground: false },
  },
  {
    identifier: "ADD_250",
    buttonTitle: "+250 ml",
    options: { opensAppToForeground: false },
  },
]);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💧 Drink water",
      body: "Quick add your intake",
      categoryIdentifier: "hydration",
    },
    trigger: null,
  });
};