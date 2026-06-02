import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Todo Driver</Text>
          <Text style={styles.subtle}>Membership active · 100 MXN/day</Text>
        </View>
        <TouchableOpacity style={styles.online}>
          <Text style={styles.onlineText}>Online</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.earnings}>
        <Text style={styles.subtle}>Today earnings</Text>
        <Text style={styles.amount}>$1,240 MXN</Text>
        <Text style={styles.zero}>0% platform commission</Text>
      </View>
      <View style={styles.request}>
        <Text style={styles.title}>New ride request</Text>
        <Text style={styles.route}>Centro → Marina</Text>
        <Text style={styles.detail}>4 min pickup · $96 MXN · cash</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.reject}>
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.grid}>
        <Stat label="Rating" value="4.92" />
        <Stat label="Acceptance" value="98%" />
        <Stat label="Cashout" value="Ready" />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#132622", flex: 1, padding: 18 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  logo: { color: "white", fontSize: 26, fontWeight: "900" },
  subtle: { color: "#b8cbc4", marginTop: 4 },
  online: { backgroundColor: "#0e8f6f", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  onlineText: { color: "white", fontWeight: "900" },
  earnings: { backgroundColor: "#24413a", borderRadius: 8, marginTop: 24, padding: 18 },
  amount: { color: "white", fontSize: 36, fontWeight: "900", marginTop: 8 },
  zero: { color: "#72dfbf", fontWeight: "900", marginTop: 8 },
  request: { backgroundColor: "white", borderRadius: 8, marginTop: 18, padding: 18 },
  title: { color: "#132622", fontSize: 22, fontWeight: "900" },
  route: { color: "#132622", fontSize: 18, fontWeight: "800", marginTop: 14 },
  detail: { color: "#687672", marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  reject: { alignItems: "center", backgroundColor: "#eef3f0", borderRadius: 8, flex: 1, height: 52, justifyContent: "center" },
  rejectText: { color: "#132622", fontWeight: "900" },
  accept: { alignItems: "center", backgroundColor: "#0e8f6f", borderRadius: 8, flex: 1, height: 52, justifyContent: "center" },
  acceptText: { color: "white", fontWeight: "900" },
  grid: { flexDirection: "row", gap: 10, marginTop: 18 },
  stat: { backgroundColor: "#24413a", borderRadius: 8, flex: 1, padding: 14 },
  statValue: { color: "white", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#b8cbc4", marginTop: 4 }
});

