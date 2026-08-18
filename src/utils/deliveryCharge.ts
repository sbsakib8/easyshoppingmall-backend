export function calculateDeliveryCharge(district?: string) {
    if (!district) return 120; // safe fallback

    const dhakaDistricts = [
        "ঢাকা",
        "Dhaka",
        "Dhanmondi",
        "Gulshan",
        "Mirpur",
        "Motijheel",
        "Uttara",
        "Mohammadpur",
        "Tejgaon",
        "Kamrangirchar",
    ];

    const normalized = district.trim().toLowerCase();

    const isDhaka = dhakaDistricts.some((d) =>
        normalized.includes(d.toLowerCase())
    );

    return isDhaka ? 60 : 120;
}
