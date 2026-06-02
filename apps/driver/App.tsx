import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import type { Socket } from "socket.io-client";
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
import { DAILY_MEMBERSHIP_MXN, RealtimeEvents, Ride, TodoApiError } from "@todo/shared";
import { api, DRIVER_START_LOCATION } from "./src/api";
import { connectDriverSocket } from "./src/socket";

const peso = (n: number) => `$${Math.round(n).toLocaleString("en-US")} MXN`;

interface DriverState {
  online: boolean;
  membershipActive: boolean;
  earningsToday: number;
  rides: number;
}

export default function App() {
  const [token, setToken] = useState<string>();
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {!token ? <Login onLogin={setToken} /> : <Dashboard />}
    </SafeAreaView>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("+5216249998877");
  const [code, setCode] = useState("000000");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const { accessToken } = await api.verifyOtp({ phone, code, role: "driver" });
      api.setToken(accessToken);
      await api.onboardDriver({ plate: "BCS-0001" }).catch(() => undefined);
      onLogin(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.loginPanel}>
      <Text style={styles.logo}>Todo Driver</Text>
      <Text style={styles.subtle}>OTP login · dev code 000000</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="OTP code" keyboardType="number-pad" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.accept} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.acceptText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

function Dashboard() {
  const [state, setState] = useState<DriverState>({
    online: false,
    membershipActive: false,
    earningsToday: 0,
    rides: 0,
  });
  const [offer, setOffer] = useState<Ride>();
  const [active, setActive] = useState<Ride>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onlineRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const [membership, earnings] = await Promise.all([api.membershipStatus(), api.earnings()]);
      setState((s) => ({
        ...s,
        membershipActive: membership.active,
        earningsToday: earnings.today,
        rides: earnings.rides,
      }));
    } catch (err) {
      if (err instanceof TodoApiError && err.status >= 500) setError(err.message);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    // Resume an in-progress ride if the app restarted mid-trip.
    api
      .myActiveRides()
      .then((rides) => rides[0] && setActive(rides[0]))
      .catch(() => undefined);

    // Realtime push: receive ride offers instead of polling.
    const socket = connectDriverSocket({
      onConnect: () => {
        if (onlineRef.current) socket.emit(RealtimeEvents.DriversSubscribe);
      },
      onOffer: (ride) => setOffer((current) => current ?? ride),
      onTaken: ({ rideId }) => setOffer((current) => (current?.id === rideId ? undefined : current)),
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [refreshStatus]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  const activateMembership = () =>
    run("Activation", async () => {
      await api.activateMembership("daily");
      await refreshStatus();
    });

  const toggleOnline = () =>
    run("Toggle", async () => {
      const next = !state.online;
      await api.setOnline(next);
      onlineRef.current = next;
      const socket = socketRef.current;
      if (next) {
        await api.updateLocation(DRIVER_START_LOCATION);
        socket?.emit(RealtimeEvents.DriversSubscribe);
        // Pick up any rider already waiting before we subscribed.
        const waiting = await api.availableRides().catch(() => []);
        if (waiting[0]) setOffer((current) => current ?? waiting[0]);
      } else {
        socket?.emit(RealtimeEvents.DriversUnsubscribe);
        setOffer(undefined);
      }
      setState((s) => ({ ...s, online: next }));
    });

  const accept = (ride: Ride) =>
    run("Accept", async () => {
      setActive(await api.acceptRide(ride.id));
      setOffer(undefined);
    });

  const advance = (ride: Ride) =>
    run("Update", async () => {
      if (ride.status === "driver_assigned") setActive(await api.arriveRide(ride.id));
      else if (ride.status === "driver_arriving") setActive(await api.startRide(ride.id));
      else if (ride.status === "in_progress") {
        await api.completeRide(ride.id);
        setActive(undefined);
        await refreshStatus();
      }
    });

  const nextLabel: Record<string, string> = {
    driver_assigned: "I've arrived",
    driver_arriving: "Start trip",
    in_progress: "Complete trip",
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Todo Driver</Text>
          <Text style={styles.subtle}>
            {state.membershipActive ? `Membership active · ${DAILY_MEMBERSHIP_MXN} MXN/day` : "Membership inactive"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.online, !state.online && styles.offline]}
          onPress={toggleOnline}
          disabled={busy}
        >
          <Text style={styles.onlineText}>{state.online ? "Online" : "Offline"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.earnings}>
        <Text style={styles.subtle}>Today earnings · {state.rides} rides</Text>
        <Text style={styles.amount}>{peso(state.earningsToday)}</Text>
        <Text style={styles.zero}>0% platform commission</Text>
      </View>

      {error ? <Text style={[styles.error, styles.errorDark]}>{error}</Text> : null}

      {!state.membershipActive ? (
        <View style={styles.request}>
          <Text style={styles.title}>Activate membership</Text>
          <Text style={styles.detail}>Pay {DAILY_MEMBERSHIP_MXN} MXN/day to receive ride requests. No commission, ever.</Text>
          <TouchableOpacity style={styles.accept} onPress={activateMembership} disabled={busy}>
            <Text style={styles.acceptText}>Activate daily · {DAILY_MEMBERSHIP_MXN} MXN</Text>
          </TouchableOpacity>
        </View>
      ) : active ? (
        <View style={styles.request}>
          <Text style={styles.title}>Current ride</Text>
          <Text style={styles.route}>{active.status.replace(/_/g, " ")}</Text>
          <Text style={styles.detail}>{peso(active.fare)} · {active.paymentMethod}</Text>
          {nextLabel[active.status] ? (
            <TouchableOpacity style={styles.accept} onPress={() => advance(active)} disabled={busy}>
              <Text style={styles.acceptText}>{nextLabel[active.status]}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : offer ? (
        <View style={styles.request}>
          <Text style={styles.title}>New ride request</Text>
          <Text style={styles.route}>{peso(offer.fare)} · {offer.paymentMethod}</Text>
          <Text style={styles.detail}>Tap accept to take this ride.</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.reject} onPress={() => setOffer(undefined)}>
              <Text style={styles.rejectText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accept} onPress={() => accept(offer)} disabled={busy}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.request}>
          <Text style={styles.title}>{state.online ? "Waiting for requests…" : "You're offline"}</Text>
          <Text style={styles.detail}>
            {state.online ? "You'll get the next nearby ride." : "Go online to start receiving rides."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#132622", flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 18 },
  loginPanel: { padding: 18, marginTop: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  logo: { color: "white", fontSize: 26, fontWeight: "900" },
  subtle: { color: "#b8cbc4", marginTop: 4 },
  input: { backgroundColor: "#24413a", borderRadius: 8, color: "white", height: 48, marginTop: 10, paddingHorizontal: 14 },
  online: { backgroundColor: "#0e8f6f", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  offline: { backgroundColor: "#687672" },
  onlineText: { color: "white", fontWeight: "900" },
  earnings: { backgroundColor: "#24413a", borderRadius: 8, marginTop: 24, padding: 18 },
  amount: { color: "white", fontSize: 36, fontWeight: "900", marginTop: 8 },
  zero: { color: "#72dfbf", fontWeight: "900", marginTop: 8 },
  request: { backgroundColor: "white", borderRadius: 8, marginTop: 18, padding: 18 },
  title: { color: "#132622", fontSize: 22, fontWeight: "900" },
  route: { color: "#132622", fontSize: 18, fontWeight: "800", marginTop: 14, textTransform: "capitalize" },
  detail: { color: "#687672", marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  reject: { alignItems: "center", backgroundColor: "#eef3f0", borderRadius: 8, flex: 1, height: 52, justifyContent: "center" },
  rejectText: { color: "#132622", fontWeight: "900" },
  accept: { alignItems: "center", backgroundColor: "#0e8f6f", borderRadius: 8, flex: 1, height: 52, justifyContent: "center", marginTop: 12 },
  acceptText: { color: "white", fontWeight: "900" },
  error: { color: "#b93434", fontWeight: "700", marginTop: 10 },
  errorDark: { color: "#ffb4b4" },
});
