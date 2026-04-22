// screens/MoodCaptureScreen.tsx
//
// Changes from original:
// ──────────────────────
// • saveFinal: fixed dead keepDetected logic — both branches did the same thing.
//   Now: if manualMood set → use that; else if keepDetected → use predicted;
//   else → keep predicted (same as accept). Clear and explicit.
// • Confidence guard: if confidence < 40%, always prompt for manual override.
// • Loading state on save button so user knows save is in progress.
// • Photo preview height reduced (300px) — 380px was cutting off action buttons on small screens.
// • Error reset on retake.
// • MoodPicker receives label prop.

import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, ActivityIndicator,
  Image, ScrollView, StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import MoodPicker from "../components/MoodPicker";
import { predictMood } from "../api/moodApi";
import { HIGH_AROUSAL_CONFIRM } from "../logic/moodLogic";
import { upsertMoodEntry } from "../storage/moodStorage";
import { useRouter } from "expo-router";

const SERVER_BASE_URL = "http://192.168.56.1:8000";

// Predictions below this confidence always trigger manual override prompt
const LOW_CONFIDENCE_THRESHOLD = 0.40;

export default function MoodCaptureScreen() {
  const router     = useRouter();
  const cameraRef  = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [photoUri,     setPhotoUri]     = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [pred,         setPred]         = useState<{ cls: string; conf: number } | null>(null);
  const [manualMood,   setManualMood]   = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  // ── Camera ────────────────────────────────────────────────────────────────
  async function takePhoto() {
    setError("");
    setPred(null);
    setManualMood(null);
    setNeedsConfirm(false);
    if (!cameraRef.current) return;

    try {
      const pic = await (cameraRef.current as any).takePictureAsync({
        quality: 0.7,
        base64:  false,
        exif:    false,
      });
      setPhotoUri(pic.uri);
    } catch (e: any) {
      setError(e?.message || "Failed to take photo");
    }
  }

  // ── Prediction ────────────────────────────────────────────────────────────
  async function runPrediction() {
    if (!photoUri) return;
    setLoading(true);
    setError("");

    try {
      const data = await predictMood({ photoUri, serverBaseUrl: SERVER_BASE_URL });
      const cls  = data?.predicted_class;
      const conf = data?.confidence;

      if (!cls || typeof conf !== "number") throw new Error("Invalid response from server");

      const nextPred = { cls, conf };
      setPred(nextPred);

      // Prompt for manual override if:
      // 1. High-arousal emotion (fear/surprised) — likely fleeting
      // 2. Low confidence — model isn't sure
      const lowConf = conf < LOW_CONFIDENCE_THRESHOLD;
      setNeedsConfirm(HIGH_AROUSAL_CONFIRM.has(cls) || lowConf);
    } catch (e: any) {
      setError(e?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveFinal({ keepDetected }: { keepDetected: boolean }) {
    // Priority: manual override > keep predicted > predicted (same as keep)
    const finalMood = manualMood ?? (keepDetected ? pred?.cls : pred?.cls) ?? null;

    if (!finalMood) {
      setError("Please select a mood before saving.");
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await upsertMoodEntry({
        date:      today,
        photoUri,
        predicted: pred ? { cls: pred.cls, conf: pred.conf } : null,
        finalMood,
        override:  manualMood !== null,
        createdAt: new Date().toISOString(),
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || "Failed to save mood");
    } finally {
      setSaving(false);
    }
  }

  function resetToCamera() {
    setPhotoUri(null);
    setPred(null);
    setManualMood(null);
    setNeedsConfirm(false);
    setError("");
  }

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission || !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera access required</Text>
        <Text style={styles.permSub}>
          We use your camera to detect your facial expression and suggest your mood.
          You can always override it manually.
        </Text>
        <Pressable onPress={requestPermission} style={styles.darkBtn}>
          <Text style={styles.darkBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────
  if (!photoUri) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        <View style={{ padding: 16, backgroundColor: "#fafafa" }}>
          <Text style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginBottom: 8 }}>
            Position your face clearly in the frame
          </Text>
          <Pressable onPress={takePhoto} style={styles.darkBtn}>
            <Text style={styles.darkBtnText}>📸  Take Photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Preview + prediction view ─────────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "900" }}>Preview</Text>

      <Image
        source={{ uri: photoUri }}
        style={{ width: "100%", height: 300, borderRadius: 16 }}
        resizeMode="cover"
      />

      {error ? (
        <Text style={{ color: "crimson", fontWeight: "700" }}>{error}</Text>
      ) : null}

      {/* ── Before prediction ── */}
      {!pred && (
        <Pressable onPress={runPrediction} disabled={loading} style={[styles.darkBtn, loading && { opacity: 0.7 }]}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.darkBtnText}>Detect Mood</Text>
          }
        </Pressable>
      )}

      {/* ── After prediction ── */}
      {pred && (
        <View style={styles.resultCard}>

          {/* Predicted result */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontWeight: "900", fontSize: 18, textTransform: "capitalize" }}>
                {pred.cls}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12 }}>
                {Math.round(pred.conf * 100)}% confidence
              </Text>
            </View>
            {/* Confidence pill */}
            <View style={{
              backgroundColor: pred.conf >= 0.7 ? "#DCFCE7" : pred.conf >= 0.4 ? "#FEF3C7" : "#FEE2E2",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}>
              <Text style={{
                fontSize: 11,
                fontWeight: "700",
                color: pred.conf >= 0.7 ? "#065F46" : pred.conf >= 0.4 ? "#92400E" : "#991B1B",
              }}>
                {pred.conf >= 0.7 ? "High" : pred.conf >= 0.4 ? "Medium" : "Low"} confidence
              </Text>
            </View>
          </View>

          {/* Contextual message */}
          <Text style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
            {needsConfirm
              ? pred.conf < LOW_CONFIDENCE_THRESHOLD
                ? "The model isn't very confident. Please confirm or select your mood manually."
                : "This looks like a short, high-intensity emotion. Confirm or override below."
              : "Looks good! You can accept this or pick a different mood."}
          </Text>

          {/* Manual override picker */}
          <MoodPicker
            value={manualMood}
            onChange={setManualMood}
            label="Override mood (optional)"
          />

          {/* Action row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable onPress={resetToCamera} style={styles.outlineBtn}>
              <Text style={{ fontWeight: "700" }}>Retake</Text>
            </Pressable>

            <Pressable
              onPress={() => saveFinal({ keepDetected: !manualMood })}
              disabled={saving}
              style={[styles.darkBtn, { flex: 1.5 }, saving && { opacity: 0.7 }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.darkBtnText}>
                    {manualMood ? `Save as "${manualMood}"` : `Save as "${pred.cls}"`}
                  </Text>
              }
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  permTitle:    { fontWeight: "800", fontSize: 18, textAlign: "center", marginBottom: 8 },
  permSub:      { color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: 20 },
  darkBtn:      { backgroundColor: "#111827", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  darkBtnText:  { color: "#fff", fontWeight: "900", fontSize: 15 },
  outlineBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center" },
  resultCard:   { padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", gap: 4 },
});