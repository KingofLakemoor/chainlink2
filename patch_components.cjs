const fs = require('fs');

const filesToPatch = [
    'src/pages/dashboard/DashboardPage.tsx',
    'src/pages/profile/ProfilePage.tsx',
    'src/pages/shop/ShopPage.tsx'
];

for (const file of filesToPatch) {
    let content = fs.readFileSync(file, 'utf8');

    // Import GenesisSyndicate and PrimeCircuitRing
    if (!content.includes("import { GenesisSyndicate }")) {
        content = content.replace("import { PhantomStarBanner } from '../../components/ui/profile-banners/phantom-star';",
            "import { PhantomStarBanner } from '../../components/ui/profile-banners/phantom-star';\nimport { GenesisSyndicate } from '../../components/ui/profile-banners/genesis-syndicate';\nimport { PrimeCircuitRing } from '../../components/ui/avatar-backgrounds/prime-circuit-ring';");
    }

    // Add GenesisSyndicate to ProfileBannerMap
    if (!content.includes("'GenesisSyndicate': GenesisSyndicate")) {
        content = content.replace("'PhantomStarBanner': PhantomStarBanner",
            "'PhantomStarBanner': PhantomStarBanner,\n  'GenesisSyndicate': GenesisSyndicate");
    }

    // Add PrimeCircuitRing to AvatarBackgroundMap
    if (!content.includes("'PrimeCircuitRing': PrimeCircuitRing")) {
        content = content.replace("'PhantomStar': PhantomStar",
            "'PhantomStar': PhantomStar,\n  'PrimeCircuitRing': PrimeCircuitRing");
    }

    fs.writeFileSync(file, content);
}
