import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface HeaderProps {
	title?: string;
	showBack?: boolean;
	onBack?: () => void;
	onMenu?: () => void;
	right?: React.ReactNode;
	style?: ViewStyle;
}

export function AppHeader({ title = 'JEMINA', showBack, onBack, onMenu, right, style }: HeaderProps) {
	const { openSidebar } = useNavigation();
	const handleMenu = onMenu ?? openSidebar;

	return (
		<View style={[styles.container, style]}>
			<View style={styles.left}>
				{showBack ? (
					<Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
						<Icon name="chevron-right" size={28} color={colors.onPrimary} style={styles.backIcon} />
					</Pressable>
				) : (
					<Pressable style={styles.iconBtn} onPress={handleMenu} hitSlop={8}>
						<Icon name="menu" size={26} color={colors.onPrimary} />
					</Pressable>
				)}
				<Text style={styles.title}>{title}</Text>
			</View>
			<View style={styles.right}>{right}</View>
		</View>
	);
}

export function HeaderNotificationButton({ hasBadge = false, onPress }: { hasBadge?: boolean; onPress?: () => void }) {
	return (
		<Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
			<Icon name="notifications" size={26} color={colors.onPrimary} />
			{hasBadge && <View style={styles.notifBadge} />}
		</Pressable>
	);
}

export function HeaderCartButton({ count = 0, onPress }: { count?: number; onPress?: () => void }) {
	return (
		<Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
			<Icon name="shopping-cart" size={26} color={colors.onPrimary} />
			{count > 0 && (
				<View style={styles.cartBadge}>
					<Text style={styles.cartBadgeText}>{count}</Text>
				</View>
			)}
		</Pressable>
	);
}

export function HeaderSearchButton({ onPress }: { onPress?: () => void }) {
	return (
		<Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
			<Icon name="search" size={26} color={colors.onPrimary} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.primary,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		minHeight: 48,
	},
	left: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
	},
	right: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
	},
	iconBtn: {
		padding: 4,
		borderRadius: 4,
		position: 'relative',
	},
	backIcon: {
		transform: [{ rotate: '180deg' }],
	},
	title: {
		...typography.headlineLg,
		fontWeight: '700',
		color: colors.onPrimary,
		letterSpacing: -0.5,
	},
	notifBadge: {
		position: 'absolute',
		top: 2,
		right: 2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.secondaryContainer,
	},
	cartBadge: {
		position: 'absolute',
		top: -2,
		right: -4,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: colors.secondaryContainer,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 3,
	},
	cartBadgeText: {
		color: colors.onSecondaryContainer,
		fontSize: 9,
		fontWeight: '700',
		lineHeight: 12,
	},
});
