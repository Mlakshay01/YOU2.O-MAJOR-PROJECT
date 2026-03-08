// Mood capture screen (camera → predict → confirm/override → save)

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import MoodPicker from "../components/MoodPicker";
import { predictMood } from "../api/moodApi";
import { HIGH_AROUSAL_CONFIRM } from "../logic/moodLogic";
import { upsertMoodEntry } from "../storage/moodStorage";
import { useRouter } from "expo-router";

const SERVER_BASE_URL = "http://10.241.113.80:8000"; 


export default function MoodCaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pred, setPred] = useState(null); // { cls, conf }
  const [manualMood, setManualMood] = useState(null);

  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  async function takePhoto() {
    setError("");
    setPred(null);
    setManualMood(null);
    setNeedsConfirm(false);

    if (!cameraRef.current) return;

    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
      });
      setPhotoUri(pic.uri);
    } catch (e) {
      setError(e?.message || "Failed to take photo");
    }
  }

  async function runPrediction() {
    if (!photoUri) return;

    setLoading(true);
    setError("");
    try {
      const data = await predictMood({ photoUri, serverBaseUrl: SERVER_BASE_URL });
      const cls = data?.predicted_class;
      const conf = data?.confidence;

      if (!cls || typeof conf !== "number") {
        throw new Error("Invalid response from server");
      }

      const nextPred = { cls, conf };
      setPred(nextPred);
      setNeedsConfirm(HIGH_AROUSAL_CONFIRM.has(cls));
    } catch (e) {
      setError(e?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveFinal({ keepDetected }) {
    // keepDetected: boolean (if user explicitly keeps fear/surprised)
    const today = new Date().toISOString().slice(0, 10);

    const predicted = pred ? { cls: pred.cls, conf: pred.conf } : null;

    const finalMood = manualMood
      ? manualMood
      : keepDetected
        ? pred?.cls
        : pred?.cls; // default accept predicted if no manual

    if (!finalMood) {
      setError("No mood selected");
      return;
    }

    const entry = {
      date: today,
      photoUri,
      predicted,
      finalMood,
      override: manualMood ? true : false,
      createdAt: new Date().toISOString(),
    };

    await upsertMoodEntry(entry);
    router.back();
  }

  if (!permission || !permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ fontWeight: "800", fontSize: 16, textAlign: "center" }}>
          Camera permission is required.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#111" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      {!photoUri ? (
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
          <View style={{ padding: 16, backgroundColor: "#fafafa" }}>
            <Pressable
              onPress={takePhoto}
              style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: "#111", alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Take Photo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>Preview</Text>
          <Image source={{ uri: photoUri }} style={{ width: "100%", height: 380, borderRadius: 16 }} />

          {error ? <Text style={{ color: "crimson", fontWeight: "700" }}>{error}</Text> : null}

          {!pred ? (
            <Pressable
              onPress={runPrediction}
              disabled={loading}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "#111",
                alignItems: "center",
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? <ActivityIndicator /> : <Text style={{ color: "#fff", fontWeight: "900" }}>Predict Mood</Text>}
            </Pressable>
          ) : (
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", gap: 8 }}>
              <Text style={{ fontWeight: "900", fontSize: 16 }}>
                Predicted: {pred.cls} ({Math.round(pred.conf * 100)}%)
              </Text>

              {needsConfirm ? (
                <Text style={{ color: "#555" }}>
                  This looks like a short, high-intensity emotion. Confirm, retake, or override manually.
                </Text>
              ) : (
                <Text style={{ color: "#555" }}>
                  You can accept this or override manually.
                </Text>
              )}

              <MoodPicker value={manualMood} onChange={setManualMood} />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    setPhotoUri(null);
                    setPred(null);
                    setManualMood(null);
                    setNeedsConfirm(false);
                    setError("");
                  }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", alignItems: "center" }}
                >
                  <Text style={{ fontWeight: "900" }}>Retake</Text>
                </Pressable>

                <Pressable
                  onPress={() => saveFinal({ keepDetected: true })}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#111", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}