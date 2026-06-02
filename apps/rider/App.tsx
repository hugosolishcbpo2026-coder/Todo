import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DriverMatch, FareEstimate, Ride, TodoApiError } from "@todo/shared";
import { api, PRESET_LOCATIONS } from "./src/api";

const POLL_MS = 3000;
const peso = (n: number) => `$${Math.round(n)} MXN`;
const STATUS_LABEL: Record<string, string> = {
  requested: "Finding your driver…",
  driver_assigned: "Driver is on the way",
  driver_arriving: "Driver is arriving",
  in_progress: "On your way",
  completed: "Trip completed",
  cancelled: "Trip cancelled",
};

export default function App() {
  const [token, setToken] = useState<string>();
  const [ride, setRide] = useState<Ride>();
  const [match, setMatch] = useState<DriverMatch>();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.logo}>Todo</Text>
        <TouchableOpacity style={styles.whatsAppButton}>
          <Text style={styles.whatsAppText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
      {!token ? (
        <Login onLogin={setToken} />
      ) : !ride ? (
        <RequestRide
          onRequested={(r, m) => {
            setRide(r);
            setMatch(m);
          }}
        />
      ) : (
        <Tracking
          ride={ride}
          match={match}
          onUpdate={setRide}
          onReset={() => {
            setRide(undefined);
            setMatch(undefined);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("+5216241112233");
  const [code, setCode] = useState("000000");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const { accessToken } = await api.verifyOtp({ phone, code, role: "rider" });
      api.setToken(accessToken);
      onLogin(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.muted}>OTP login · dev code 000000</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="OTP code" keyboardType="number-pad" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

function RequestRide({ onRequested }: { onRequested: (ride: Ride, match?: DriverMatch) => void }) {
  const [estimate, setEstimate] = useState<FareEstimate>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const payload = {
    pickup: { lat: PRESET_LOCATIONS.pickup.lat, lng: PRESET_LOCATIONS.pickup.lng },
    dropoff: { lat: PRESET_LOCATIONS.dropoff.lat, lng: PRESET_LOCATIONS.dropoff.lng },
    paymentMethod: "cash" as const,
  };

  const loadEstimate = useCallback(async () => {
    try {
      setEstimate(await api.estimateRide(payload));
    } catch {
      /* estimate is best-effort */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadEstimate();
  }, [loadEstimate]);

  async function findDriver() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.requestRide(payload);
      onRequested(result.ride, result.matches[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request ride");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.flexPanel}>
      <View style={styles.map}>
        <Text style={styles.pin}>Pickup</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Request a ride</Text>
        <Row label="Pickup" value={PRESET_LOCATIONS.pickup.label} />
        <Row label="Dropoff" value={PRESET_LOCATIONS.dropoff.label} />
        <View style={styles.fare}>
          <Text style={styles.fareLabel}>Estimated fare</Text>
          <Text style={styles.fareValue}>{estimate ? peso(estimate.riderPrice) : "—"}</Text>
        </View>
        {estimate ? (
          <Text style={styles.muted}>
            {estimate.distanceKm} km · ~{estimate.durationMinutes} min · driver keeps 100%
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={findDriver} disabled={busy}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Find driver</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Tracking({
  ride,
  match,
  onUpdate,
  onReset,
}: {
  ride: Ride;
  match?: DriverMatch;
  onUpdate: (ride: Ride) => void;
  onReset: () => void;
}) {
  const [error, setError] = useState<string>();
  const done = ride.status === "completed" || ride.status === "cancelled";

  useEffect(() => {
    if (done) return;
    const timer = setInterval(async () => {
      try {
        onUpdate(await api.getRide(ride.id));
      } catch (err) {
        if (!(err instanceof TodoApiError)) setError("Connection lost — retrying");
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [ride.id, done, onUpdate]);

  async function cancel() {
    try {
      onUpdate(await api.cancelRide(ride.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.flexPanel}>
      <View style={styles.map}>
        <Text style={styles.pin}>{match ? `ETA ${match.etaMinutes} min` : "Driver"}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>{STATUS_LABEL[ride.status] ?? ride.status}</Text>
        <Row label="Ride" value={`${ride.id.slice(0, 14)}…`} />
        <Row label="Status" value={ride.status.replace(/_/g, " ")} />
        <Row label="Fare" value={peso(ride.fare)} />
        {match ? <Row label="Driver" value={`${match.distanceKm} km · ★ ${match.rating}`} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {done ? (
          <TouchableOpacity style={styles.primary} onPress={onReset}>
            <Text style={styles.primaryText}>Book another ride</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.secondary} onPress={cancel}>
            <Text style={styles.secondaryText}>Cancel ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.fareLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#eef3f0", flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 18 },
  logo: { color: "#132622", fontSize: 30, fontWeight: "900" },
  whatsAppButton: { backgroundColor: "#0e8f6f", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  whatsAppText: { color: "white", fontWeight: "800" },
  flexPanel: { flexGrow: 1 },
  map: { alignItems: "center", backgroundColor: "#dfeae5", flex: 1, justifyContent: "center", margin: 18, borderRadius: 8, minHeight: 220 },
  pin: { backgroundColor: "#132622", borderRadius: 24, color: "white", fontWeight: "900", overflow: "hidden", padding: 12 },
  panel: { backgroundColor: "white", borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 18 },
  title: { color: "#132622", fontSize: 24, fontWeight: "900", marginBottom: 12 },
  muted: { color: "#687672", marginBottom: 10 },
  input: { backgroundColor: "#f3f7f5", borderRadius: 8, height: 48, marginBottom: 10, paddingHorizontal: 14 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  rowValue: { color: "#132622", fontWeight: "800" },
  fare: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  fareLabel: { color: "#687672" },
  fareValue: { color: "#132622", fontSize: 22, fontWeight: "900" },
  primary: { alignItems: "center", backgroundColor: "#0e8f6f", borderRadius: 8, height: 52, justifyContent: "center", marginTop: 8 },
  primaryText: { color: "white", fontSize: 16, fontWeight: "900" },
  secondary: { alignItems: "center", height: 48, justifyContent: "center", marginTop: 8 },
  secondaryText: { color: "#0e8f6f", fontWeight: "900" },
  error: { color: "#b93434", fontWeight: "700", marginBottom: 8 },
});
