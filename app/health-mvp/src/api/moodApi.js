import { Platform } from "react-native";

export async function predictMood({ photoUri, serverBaseUrl }) {
  const form = new FormData();

  if (Platform.OS === "web") {
    // Web requires Blob
    const response = await fetch(photoUri);
    const blob = await response.blob();
    form.append("image", blob, "mood.jpg");
  } else {
    // Mobile (Android / iOS)
    form.append("image", {
      uri: photoUri,
      name: "mood.jpg",
      type: "image/jpeg",
    });
  }

  const res = await fetch(`${serverBaseUrl}/predict-mood`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Predict failed (${res.status}): ${text}`);
  }

  return await res.json();
}