#ifndef HEXUKI_TIMER_H
#define HEXUKI_TIMER_H

#include <cstdint>

namespace hexuki {

/**
 * Platform-independent bit operations
 * (MSVC vs GCC/Clang compatibility)
 */
class BitOps {
public:
    // Count trailing zeros (position of lowest set bit)
    static inline int countTrailingZeros(uint32_t value) {
#ifdef _MSC_VER
        // MSVC intrinsic
        unsigned long index;
        _BitScanForward(&index, value);
        return static_cast<int>(index);
#else
        // GCC/Clang intrinsic
        return __builtin_ctz(value);
#endif
    }

    // Count set bits (population count)
    static inline int popcount(uint32_t value) {
#ifdef _MSC_VER
        // MSVC intrinsic
        return __popcnt(value);
#else
        // GCC/Clang intrinsic
        return __builtin_popcount(value);
#endif
    }
};

} // namespace hexuki

#endif // HEXUKI_TIMER_H
