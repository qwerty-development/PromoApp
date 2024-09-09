import React, { useEffect, useState, useCallback } from 'react'
import {
	StyleSheet,
	useColorScheme,
	TouchableOpacity,
	TextInput,
	View,
	RefreshControl,
	ActivityIndicator,
	Image,
	FlatList,
	Dimensions
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useDebounce } from 'use-debounce'

import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { Colors } from '@/constants/Colors'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

interface Promotion {
	id: number
	title: string
	description: string
	start_date: string
	end_date: string
	banner_url: string
	seller: {
		id: string
		contact_number: string
		business_name: string
		business_logo: string
	}
	industry: {
		id: number
		name: string
	}
}

interface Industry {
	id: number
	name: string
	icon: string
}

const FEATURED_ITEM_SIZE = width * 0.8
const ITEMS_PER_PAGE = 10

export default function HomeScreen() {
	const [allPromotions, setAllPromotions] = useState<Promotion[]>([])
	const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([])
	const [featuredPromotions, setFeaturedPromotions] = useState<Promotion[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearchQuery] = useDebounce(searchQuery, 300)
	const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null)
	const [industries, setIndustries] = useState<Industry[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [page, setPage] = useState(0)
	const [hasMore, setHasMore] = useState(true)

	const colorScheme = useColorScheme()
	const colors = Colors[colorScheme ?? 'light']
	const router = useRouter()

	const fetchPromotions = async (
		pageNumber: number,
		query: string = '',
		industryId: number | null = null
	) => {
		setLoadingMore(true)
		let promotionsQuery = supabase
			.from('promotions')
			.select(
				`
      *,
      seller:users (id, contact_number, business_name, business_logo),
      industry:industries (id, name)
    `,
				{ count: 'exact' }
			)
			.eq('is_approved', true)

		if (query) {
			promotionsQuery = promotionsQuery.or(
				`title.ilike.%${query}%,description.ilike.%${query}%,seller.business_name.ilike.%${query}%`
			)
		}

		if (industryId !== null) {
			promotionsQuery = promotionsQuery.eq('industry_id', industryId)
		}

		promotionsQuery = promotionsQuery.order('created_at', { ascending: false })

		try {
			const { count } = await promotionsQuery

			const totalItems = count || 0
			const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
			const safePage = Math.min(pageNumber, totalPages)
			const startRange = safePage * ITEMS_PER_PAGE
			const endRange = Math.min(
				(safePage + 1) * ITEMS_PER_PAGE - 1,
				totalItems - 1
			)

			const { data, error } = await promotionsQuery.range(startRange, endRange)

			if (error) {
				console.error('Error fetching promotions:', error)
			} else {
				if (pageNumber === 0) {
					setAllPromotions(data)
					setFilteredPromotions(data)
					setFeaturedPromotions(data.slice(0, 5))
				} else {
					setAllPromotions(prevPromotions => [...prevPromotions, ...data])
					setFilteredPromotions(prevPromotions => [...prevPromotions, ...data])
				}
				setHasMore(data.length === ITEMS_PER_PAGE)
			}
		} catch (error) {
			console.error('Error in fetchPromotions:', error)
		} finally {
			setLoading(false)
			setLoadingMore(false)
		}
	}


	const fetchIndustries = async () => {
		const { data, error } = await supabase
			.from('industries')
			.select('*')
			.order('name')

		if (error) {
			console.error('Error fetching industries:', error)
		} else {
			setIndustries(
				data.map(industry => ({
					...industry,
					icon: getIndustryIcon(industry.name)
				}))
			)
		}
	}

	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		setPage(0)
		setHasMore(true)
		await Promise.all([
			fetchPromotions(0, debouncedSearchQuery, selectedIndustry),
			fetchIndustries()
		])
		setRefreshing(false)
	}, [debouncedSearchQuery, selectedIndustry])

	useEffect(() => {
		fetchPromotions(0)
		fetchIndustries()
	}, [])

	useEffect(() => {
		setPage(0)
		setHasMore(true)
		fetchPromotions(0, debouncedSearchQuery, selectedIndustry)
	}, [debouncedSearchQuery, selectedIndustry])

	const getPublicUrl = (path: string) => {
		if (!path) return null
		const cleanPath = path.replace(
			/^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/promotion-banners\//,
			''
		)
		const { data } = supabase.storage
			.from('promotion-banners')
			.getPublicUrl(cleanPath)
		return data?.publicUrl
	}

	const handlePromotionPress = (id: number) => {
		router.push(`/promotion/${id}`)
	}

	const getIndustryIcon = (name: string) => {
		const iconMap: { [key: string]: string } = {
			Food: 'restaurant',
			Technology: 'laptop',
			Fashion: 'shirt',
			Health: 'fitness'
		}
		return iconMap[name] || 'briefcase'
	}

	const handleSearchChange = (text: string) => {
		setSearchQuery(text)
	}

	const handleIndustryPress = (industryId: number) => {
		setSelectedIndustry(selectedIndustry === industryId ? null : industryId)
	}

	const loadMorePromotions = () => {
		if (!loadingMore && hasMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchPromotions(nextPage, debouncedSearchQuery, selectedIndustry)
		}
	}

	const renderFeaturedPromotion = ({ item }: { item: Promotion }) => {
		const bannerUrl = getPublicUrl(item.banner_url)

		return (
			<TouchableOpacity
				onPress={() => handlePromotionPress(item.id)}
				style={styles.featuredPromotionItem}>
				<Image
					source={{ uri: bannerUrl ?? undefined }}
					style={styles.featuredPromotionImage}
				/>
				<LinearGradient
					colors={['transparent', 'rgba(0,0,0,0.8)']}
					style={styles.featuredPromotionGradient}>
					<ThemedText style={styles.featuredPromotionTitle}>
						{item.title}
					</ThemedText>
					<ThemedText style={styles.featuredPromotionBusiness}>
						{item.seller.business_name}
					</ThemedText>
				</LinearGradient>
			</TouchableOpacity>
		)
	}

	const renderPromotion = ({ item }: { item: Promotion }) => {
		const bannerUrl = getPublicUrl(item.banner_url)
		const businessLogoUrl = getPublicUrl(item.seller.business_logo)

		return (
			<TouchableOpacity onPress={() => handlePromotionPress(item.id)}>
				<ThemedView style={styles.promotionItem}>
					<Image
						source={{ uri: bannerUrl ?? undefined }}
						style={styles.promotionBanner}
					/>
					<View style={styles.promotionContent}>
						<ThemedText style={styles.promotionTitle}>{item.title}</ThemedText>
						<ThemedText style={styles.promotionDescription} numberOfLines={2}>
							{item.description}
						</ThemedText>
						<View style={styles.promotionFooter}>
							<View style={styles.businessInfo}>
								<Image
									source={{ uri: businessLogoUrl ?? undefined }}
									style={styles.businessLogo}
								/>
								<ThemedText style={styles.businessName}>
									{item.seller.business_name}
								</ThemedText>
							</View>
							<ThemedText style={styles.promotionDates}>
								{new Date(item.start_date).toLocaleDateString()} -{' '}
								{new Date(item.end_date).toLocaleDateString()}
							</ThemedText>
						</View>
					</View>
				</ThemedView>
			</TouchableOpacity>
		)
	}

	const renderFooter = () => {
		if (!loadingMore) return null
		return (
			<View style={styles.footerLoader}>
				<ActivityIndicator size='small' color={colors.primary} />
			</View>
		)
	}

	return (
		<SafeAreaProvider>
			<ThemedView style={styles.container}>
				<BlurView intensity={100} style={styles.searchContainer}>
					<Ionicons
						name='search'
						size={24}
						color={colors.text}
						style={styles.searchIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder='Search promotions...'
						value={searchQuery}
						onChangeText={handleSearchChange}
						placeholderTextColor={colors.text}
					/>
				</BlurView>

				{loading ? (
					<ActivityIndicator
						size='large'
						color={colors.primary}
						style={styles.loader}
					/>
				) : (
					<FlatList
						data={filteredPromotions}
						renderItem={renderPromotion}
						keyExtractor={item => item.id.toString()}
						onEndReached={loadMorePromotions}
						onEndReachedThreshold={0.1}
						ListFooterComponent={renderFooter}
						refreshControl={
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
						}
						ListHeaderComponent={
							<>
								<View style={styles.sectionContainer}>
									<ThemedText style={styles.sectionTitle}>
										Featured Promotions
									</ThemedText>
									<FlatList
										data={featuredPromotions}
										renderItem={renderFeaturedPromotion}
										keyExtractor={item => `featured-${item.id}`}
										horizontal
										showsHorizontalScrollIndicator={false}
										style={styles.featuredList}
									/>
								</View>

								<View style={styles.sectionContainer}>
									<ThemedText style={styles.sectionTitle}>
										Categories
									</ThemedText>
									<FlatList
										data={industries}
										renderItem={({ item }) => (
											<TouchableOpacity
												style={[
													styles.industryFilter,
													selectedIndustry === item.id &&
														styles.selectedIndustryFilter
												]}
												onPress={() => handleIndustryPress(item.id)}>
												<Ionicons
													name={item.icon as any}
													size={24}
													color={
														selectedIndustry === item.id
															? colors.background
															: colors.text
													}
												/>
												<ThemedText
													style={[
														styles.industryFilterText,
														selectedIndustry === item.id &&
															styles.selectedIndustryFilterText
													]}>
													{item.name}
												</ThemedText>
											</TouchableOpacity>
										)}
										keyExtractor={item => item.id.toString()}
										horizontal
										showsHorizontalScrollIndicator={false}
										style={styles.industryFilterList}
									/>
								</View>

								<ThemedText style={styles.sectionTitle}>
									All Promotions
								</ThemedText>
							</>
						}
						ListEmptyComponent={
							<ThemedView style={styles.emptyListContainer}>
								<ThemedText style={styles.emptyListText}>
									No promotions found
								</ThemedText>
							</ThemedView>
						}
					/>
				)}
			</ThemedView>
		</SafeAreaProvider>
	)
}
const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 25,
		paddingHorizontal: 15,
		marginHorizontal: 16,
		marginVertical: 10,
		height: 50,
		overflow: 'hidden'
	},
	searchIcon: {
		marginRight: 10
	},
	searchInput: {
		flex: 1,
		fontSize: 16
	},
	loader: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	sectionContainer: {
		marginBottom: 24
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 16,
		marginLeft: 16
	},
	featuredList: {
		paddingLeft: 16
	},
	featuredPromotionItem: {
		width: FEATURED_ITEM_SIZE,
		height: FEATURED_ITEM_SIZE,
		marginRight: 16,
		borderRadius: 14,
		overflow: 'hidden'
	},
	featuredPromotionImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover'
	},
	featuredPromotionGradient: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: '50%',
		justifyContent: 'flex-end',
		padding: 15
	},
	featuredPromotionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: 'white',
		marginBottom: 5
	},
	featuredPromotionBusiness: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.8)'
	},
	industryFilterList: {
		paddingLeft: 16
	},
	industryFilter: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.1)',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderRadius: 20,
		marginRight: 10
	},
	selectedIndustryFilter: {
		backgroundColor: Colors.light.tint
	},
	industryFilterText: {
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 5
	},
	selectedIndustryFilterText: {
		color: Colors.light.background
	},
	promotionItem: {
		marginHorizontal: 16,
		marginBottom: 20,
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: 'rgba(255,255,255,0.05)'
	},
	promotionBanner: {
		width: '100%',
		height: 150,
		resizeMode: 'cover'
	},
	promotionContent: {
		padding: 15
	},
	promotionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5
	},
	promotionDescription: {
		fontSize: 14,
		marginBottom: 10,
		color: 'rgba(255,255,255,0.7)'
	},
	promotionFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	businessInfo: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	businessLogo: {
		width: 24,
		height: 24,
		borderRadius: 12,
		marginRight: 8
	},
	businessName: {
		fontSize: 14,
		fontWeight: '500'
	},
	promotionDates: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.6)'
	},
	emptyListContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	emptyListText: {
		fontSize: 16,
		color: 'rgba(255,255,255,0.6)'
	},
	footerLoader: {
		padding: 20,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
