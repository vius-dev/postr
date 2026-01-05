
import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';

interface PollDurationModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (days: number, hours: number, minutes: number) => void;
    initialDays: number;
    initialHours: number;
    initialMinutes: number;
}

const DAY_OPTIONS = Array.from({ length: 8 }, (_, i) => i);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i).filter(m => m % 5 === 0 || m === 59);

export default function PollDurationModal({
    visible,
    onClose,
    onSave,
    initialDays,
    initialHours,
    initialMinutes,
}: PollDurationModalProps) {
    const { theme } = useTheme();
    const [days, setDays] = useState(initialDays);
    const [hours, setHours] = useState(initialHours);
    const [minutes, setMinutes] = useState(initialMinutes);

    const handleSave = () => {
        onSave(days, hours, minutes);
        onClose();
    };

    const PickerColumn = ({
        label,
        options,
        value,
        onSelect
    }: {
        label: string,
        options: number[],
        value: number,
        onSelect: (v: number) => void
    }) => (
        <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: theme.textSecondary }]}>{label}</Text>
            <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnContent}
            >
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.optionItem,
                            value === option && { backgroundColor: theme.primary + '15' }
                        ]}
                        onPress={() => onSelect(option)}
                    >
                        <Text style={[
                            styles.optionText,
                            { color: theme.textPrimary },
                            value === option && { color: theme.primary, fontWeight: 'bold' }
                        ]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={[styles.headerButton, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Poll Length</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={[styles.headerButton, { color: theme.primary, fontWeight: 'bold' }]}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                        <PickerColumn label="Days" options={DAY_OPTIONS} value={days} onSelect={setDays} />
                        <PickerColumn label="Hours" options={HOUR_OPTIONS} value={hours} onSelect={setHours} />
                        <PickerColumn label="Minutes" options={MINUTE_OPTIONS} value={minutes} onSelect={setMinutes} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    headerButton: {
        fontSize: 16,
        paddingHorizontal: 8,
    },
    pickerContainer: {
        flexDirection: 'row',
        padding: 16,
        height: 300,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    columnLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    columnScroll: {
        width: '100%',
    },
    columnContent: {
        paddingBottom: 20,
    },
    optionItem: {
        width: '80%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginVertical: 2,
    },
    optionText: {
        fontSize: 18,
    },
});
