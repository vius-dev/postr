import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HashtagFeedScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Hashtag Feed</Text>
      </View>
    </SafeAreaView>
  );
}
