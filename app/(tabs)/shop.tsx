import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";

export default function ShopScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 'bold' }}>
          Coming Soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}
