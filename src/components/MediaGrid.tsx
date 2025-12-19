
import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Media } from '@/types/post';

interface MediaGridProps {
    media: Media[];
    onRemove?: (url: string) => void;
    onPress?: (index: number) => void;
}

const MediaGrid = ({ media, onRemove, onPress }: MediaGridProps) => {
    if (!media || media.length === 0) return null;

    const renderMediaItem = (item: Media, index: number, containerStyle: any) => (
        <View style={containerStyle} key={item.url}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPress?.(index)}
                style={styles.imageTouchable}
                disabled={!onPress}
            >
                <Image source={{ uri: item.url }} style={styles.mediaImage} />
            </TouchableOpacity>
            {onRemove && (
                <TouchableOpacity onPress={() => onRemove(item.url)} style={styles.removeMediaButton}>
                    <Ionicons name="close" size={18} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );

    const containerStyle = [
        styles.mediaGridContainer,
        media.length === 1 && styles.singleImageContainer,
        media.length > 1 && styles.multiImageContainer,
    ];

    if (media.length === 1) {
        return <View style={containerStyle}>{renderMediaItem(media[0], 0, styles.gridImage1)}</View>;
    }

    if (media.length === 2) {
        return (
            <View style={containerStyle}>
                {renderMediaItem(media[0], 0, styles.gridImage2)}
                {renderMediaItem(media[1], 1, styles.gridImage2)}
            </View>
        );
    }

    if (media.length === 3) {
        return (
            <View style={containerStyle}>
                {renderMediaItem(media[0], 0, styles.gridImage3Left)}
                <View style={styles.gridImage3RightContainer}>
                    {renderMediaItem(media[1], 1, styles.gridImage3Right)}
                    {renderMediaItem(media[2], 2, styles.gridImage3Right)}
                </View>
            </View>
        );
    }

    return (
        <View style={[containerStyle, { flexWrap: 'wrap' }]}>
            {media.map((item, index) => renderMediaItem(item, index, styles.gridImage4))}
        </View>
    );
};

const styles = StyleSheet.create({
    mediaGridContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        marginVertical: 8,
        backgroundColor: '#000',
    },
    singleImageContainer: {
        height: 200,
    },
    multiImageContainer: {
        height: 200,
    },
    imageTouchable: {
        width: '100%',
        height: '100%',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gridImage1: {
        width: '100%',
        height: '100%',
    },
    gridImage2: {
        width: '50%',
        height: '100%',
        borderRightWidth: 1,
        borderColor: '#000',
    },
    gridImage3Left: {
        width: '66.66%',
        height: '100%',
        borderRightWidth: 1,
        borderColor: '#000',
    },
    gridImage3RightContainer: {
        width: '33.34%',
        height: '100%',
    },
    gridImage3Right: {
        width: '100%',
        height: '50%',
        borderBottomWidth: 1,
        borderColor: '#000',
    },
    gridImage4: {
        width: '50%',
        height: '50%',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#000',
    },
    removeMediaButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default MediaGrid;
