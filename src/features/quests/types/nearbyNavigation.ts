export type NearbyNavigation = {
  count: number | null
  isLoading: boolean
}

export type QuestMapOutletContext = {
  onNearbyNavigationChange: (navigation: NearbyNavigation | null) => void
}
