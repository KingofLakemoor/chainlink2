#!/bin/bash
# Update shop_items.json
sed -i 's/"image": "bg-red-950",/"image": "ZeroZeroShaderBanner",/g' shop_items.json
sed -i 's/"preview": "bg-red-950",/"preview": "ZeroZeroShaderBanner",/g' shop_items.json

# Update DashboardPage.tsx
sed -i '/import { OpulentoVaultBanner }/a import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";' src/pages/dashboard/DashboardPage.tsx
sed -i '/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/a \ \ '\''ZeroZeroShaderBanner'\'': ZeroZeroShaderBanner' src/pages/dashboard/DashboardPage.tsx
sed -i 's/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner,/g' src/pages/dashboard/DashboardPage.tsx

# Update ProfilePage.tsx
sed -i '/import { OpulentoVaultBanner }/a import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";' src/pages/profile/ProfilePage.tsx
sed -i '/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/a \ \ '\''ZeroZeroShaderBanner'\'': ZeroZeroShaderBanner' src/pages/profile/ProfilePage.tsx
sed -i 's/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner,/g' src/pages/profile/ProfilePage.tsx

# Update LeaderboardsPage.tsx
sed -i '/import { OpulentoVaultBanner }/a import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";' src/pages/leaderboards/LeaderboardsPage.tsx
sed -i '/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/a \ \ '\''ZeroZeroShaderBanner'\'': ZeroZeroShaderBanner' src/pages/leaderboards/LeaderboardsPage.tsx
sed -i 's/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner,/g' src/pages/leaderboards/LeaderboardsPage.tsx

# Update ShopPage.tsx
sed -i '/import { OpulentoVaultBanner }/a import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";' src/pages/shop/ShopPage.tsx
sed -i '/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/a \ \ '\''ZeroZeroShaderBanner'\'': ZeroZeroShaderBanner' src/pages/shop/ShopPage.tsx
sed -i 's/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner/'\''OpulentoVaultBanner'\'': OpulentoVaultBanner,/g' src/pages/shop/ShopPage.tsx
