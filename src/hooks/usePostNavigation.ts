
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { Post } from '@/types/post';
import { PostInteractionHandlers } from '@/components/PostCard';

export function usePostNavigation(): PostInteractionHandlers {
    const router = useRouter();

    return {
        onPressPost: (post: Post) => router.push(`/post/${post.id}`),

        onPressUser: (username: string) => router.push(`/(profile)/${username}`),

        onPressCompose: (replyToPost: Post) => {
            // Must use explicit 'pathname' and 'params' for Expo Router typed routes
            // Use 'as any' if type definitions are too strict for complex objects in params
            router.push({
                pathname: '/(compose)/compose',
                params: {
                    replyToId: replyToPost.id,
                    authorUsername: replyToPost.author.username
                }
            });
        },

        onPressQuote: (quotePost: Post) => {
            router.push({
                pathname: '/(compose)/compose',
                params: { quotePostId: quotePost.id }
            });
        },

        onPressHashtag: (hashtag: string) => {
            router.push(`/explore?q=${encodeURIComponent(hashtag)}`);
        },

        onPressLink: (url: string) => {
            Linking.openURL(url).catch(err => console.error("Failed to open URL:", err));
        }
    };
}
