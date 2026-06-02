import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.logo}>Todo</Text>
        <TouchableOpacity style={styles.whatsAppButton}>
          <Text style={styles.whatsAppText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.map}>
        <Text style={styles.pin}>Pickup</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Request a ride</Text>
        <TextInput style={styles.input} placeholder="Pickup location" />
        <TextInput style={styles.input} placeholder="Dropoff location" />
        <View style={styles.fare}>
          <Text style={styles.fareLabel}>Estimated fare</Text>
          <Text style={styles.fareValue}>$96 MXN</Text>
        </View>
        <TouchableOpacity style={styles.primary}>
          <Text style={styles.primaryText}>Find driver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary}>
          <Text style={styles.secondaryText}>Schedule ride</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#eef3f0", flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 18 },
  logo: { color: "#132622", fontSize: 30, fontWeight: "900" },
  whatsAppButton: { backgroundColor: "#0e8f6f", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  whatsAppText: { color: "white", fontWeight: "800" },
  map: { alignItems: "center", backgroundColor: "#dfeae5", flex: 1, justifyContent: "center", margin: 18, borderRadius: 8 },
  pin: { backgroundColor: "#132622", borderRadius: 24, color: "white", fontWeight: "900", overflow: "hidden", padding: 12 },
  panel: { backgroundColor: "white", borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 18 },
  title: { color: "#132622", fontSize: 24, fontWeight: "900", marginBottom: 12 },
  input: { backgroundColor: "#f3f7f5", borderRadius: 8, height: 48, marginBottom: 10, paddingHorizontal: 14 },
  fare: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  fareLabel: { color: "#687672" },
  fareValue: { color: "#132622", fontSize: 22, fontWeight: "900" },
  primary: { alignItems: "center", backgroundColor: "#0e8f6f", borderRadius: 8, height: 52, justifyContent: "center" },
  primaryText: { color: "white", fontSize: 16, fontWeight: "900" },
  secondary: { alignItems: "center", height: 48, justifyContent: "center" },
  secondaryText: { color: "#0e8f6f", fontWeight: "900" }
});

