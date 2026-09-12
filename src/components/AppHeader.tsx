import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useNotification } from '../state/NotificationContext';
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
	const insets = useSafeAreaInsets();
	const { openSidebar } = useNavigation();
	const handleMenu = onMenu ?? openSidebar;

	return (
		<View style={[styles.container, { paddingTop: insets.top + spacing.sm }, style]}>
			<View style={styles.left}>
				{showBack ? (
					<Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
						<Icon name="chevron-right" size={28} color={colors.onPrimary} style={styles.backIcon} />
					</Pressable>
				) : (
					<Pressable style={styles.iconBtn} onPress={handleMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu">
						<Icon name="menu" size={26} color={colors.onPrimary} />
					</Pressable>
				)}
				<Text style={styles.title}>{title}</Text>
			</View>
			<View style={styles.right}>{right ?? <HeaderActions />}</View>
		</View>
	);
}

export function HeaderNotificationButton({ onPress }: { onPress?: () => void }) {
	const { unreadCount, clearUnread } = useNotification();
	const handlePress = onPress ?? clearUnread;
	return (
		<Pressable style={styles.iconBtn} onPress={handlePress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Notifications">
			<Icon name="notifications" size={26} color={colors.onPrimary} />
			{unreadCount > 0 && <View style={styles.notifBadge} />}
		</Pressable>
	);
}

export function HeaderCartButton({ count, onPress }: { count?: number; onPress?: () => void }) {
	const { itemCount } = useCart();
	const { switchTab } = useNavigation();
	const badgeCount = count ?? itemCount;
	const handlePress = onPress ?? (() => switchTab('Cart'));
	return (
		<Pressable style={styles.iconBtn} onPress={handlePress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Cart, ${badgeCount} items`}>
			<Icon name="shopping-cart" size={26} color={colors.onPrimary} />
			{badgeCount > 0 && (
				<View style={styles.cartBadge}>
					<Text style={styles.cartBadgeText}>{badgeCount}</Text>
				</View>
			)}
		</Pressable>
	);
}

export function HeaderActions() {
	const { navigate } = useNavigation();
	return (
		<>
			<HeaderSearchButton onPress={() => navigate('Search')} />
			<HeaderNotificationButton />
			<HeaderCartButton />
		</>
	);
}

export function HeaderSearchButton({ onPress }: { onPress?: () => void }) {
	return (
		<Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search">
			<Icon name="search" size={26} color={colors.onPrimary} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.primaryContainer,
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.sm,
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
		padding: 9,
		borderRadius: 4,
		position: 'relative',
	},
	backIcon: {
		transform: [{ rotate: '180deg' }],
	},
	title: {
		...typography.headlineMd,
		fontWeight: '700',
		color: colors.onPrimary,
		letterSpacing: -0.22,
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
