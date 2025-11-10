# Dynamic Diagram Layout System

This document explains the dynamic diagram height calculation system implemented in `docs/js/app.js`.

## Overview

The diagram uses a **configuration-based layout system** that automatically calculates heights and spacing based on selected components. This eliminates hardcoded height conditions and makes it easy to add new components.

## Architecture

### Configuration Objects

#### 1. COMPONENT_HEIGHTS
Defines the height (in pixels) for each infrastructure component:

```javascript
const COMPONENT_HEIGHTS = {
    subnet: 70,       // Height of subnet blocks
    eks: 80,          // Height of EKS block
    rds: 80,          // Height of RDS block
    // Add new components here
};
```

#### 2. GAPS
Defines all spacing and padding values:

```javascript
const GAPS = {
    outerPadding: 15,     // Padding from outer container to environment boxes
    envHeader: 40,        // Space for environment name
    vpcPadding: 15,       // Padding inside VPC container
    vpcHeader: 50,        // Space for VPC name and CIDR
    afterSubnets: 5,      // Gap after subnet blocks
    betweenComponents: 5, // Gap between components (EKS, RDS, etc.)
    legendGap: 25,        // Gap between environment boxes and legend
};
```

### Height Calculation Flow

```
totalHeight
  └─ 50 (header)
  └─ outerHeight
      └─ outerPadding (15px)
      └─ envBoxHeight
          └─ envHeader (40px)
          └─ vpcHeight
              └─ vpcHeader (50px)
              └─ vpcContentHeight
                  └─ subnet (70px)
                  └─ afterSubnets gap (5px)
                  └─ eks (80px) [if selected]
                  └─ betweenComponents gap (5px)
                  └─ rds (80px) [if selected]
              └─ vpcPadding (15px)
          └─ vpcPadding (15px)
      └─ outerPadding (15px)
  └─ legendGap (25px)
  └─ 15 (legend height)
```

## Adding New Components

Follow these 4 steps to add a new infrastructure component:

### Step 1: Add Component Height

Add the component height to `COMPONENT_HEIGHTS`:

```javascript
const COMPONENT_HEIGHTS = {
    subnet: 70,
    eks: 80,
    rds: 80,
    elasticache: 85,  // ← New component
};
```

### Step 2: Add Component Detection

Detect if the component is selected:

```javascript
const hasEKS = selectedComponents.includes('eks-auto');
const hasRDS = selectedComponents.includes('rds');
const hasElastiCache = selectedComponents.includes('elasticache');  // ← New
```

### Step 3: Update Height Calculation

Add the component to `vpcContentHeight` calculation:

```javascript
// Calculate VPC content height dynamically
let vpcContentHeight = COMPONENT_HEIGHTS.subnet; // Subnets always present

// Add additional components
if (hasEKS) {
    vpcContentHeight += GAPS.afterSubnets + COMPONENT_HEIGHTS.eks;
}
if (hasRDS) {
    vpcContentHeight += (hasEKS ? GAPS.betweenComponents : GAPS.afterSubnets) + COMPONENT_HEIGHTS.rds;
}
if (hasElastiCache) {  // ← New
    const previousComponent = hasRDS || hasEKS;
    vpcContentHeight += (previousComponent ? GAPS.betweenComponents : GAPS.afterSubnets) + COMPONENT_HEIGHTS.elasticache;
}
```

### Step 4: Add Rendering Code

Add rendering code in the environment loop (after existing components):

```javascript
// ElastiCache if selected (using dynamic positioning)
if (hasElastiCache) {
    const elastiCacheY = currentY;
    const elastiCacheWidth = vpcWidth - subnetPadding * 2;

    addRect(svg, x + GAPS.vpcPadding + subnetPadding, elastiCacheY, elastiCacheWidth,
            COMPONENT_HEIGHTS.elasticache, colors.elasticache, colors.border.elasticache);

    addText(svg, x + envBoxWidth / 2, elastiCacheY + 20, 'ElastiCache', 'normal', 'middle', colors.text);
    addText(svg, x + envBoxWidth / 2, elastiCacheY + 38, 'Redis Cluster', 'small', 'middle', colors.textSecondary);
    addText(svg, x + envBoxWidth / 2, elastiCacheY + 55, 'Multi-AZ', 'tiny', 'middle', colors.textSecondary);

    currentY = elastiCacheY + COMPONENT_HEIGHTS.elasticache + GAPS.betweenComponents;
}
```

### Step 5: Update Legend (Optional)

If you want the component to appear in the legend:

```javascript
if (hasElastiCache) {
    addText(svg, legendX + legendOffset, legendY, '● ElastiCache', 'small', 'start', colors.border.elasticache);
    legendOffset += 130;
}
```

## Benefits

✅ **No hardcoded heights** - All dimensions calculated dynamically
✅ **Automatic spacing** - Gaps calculated based on component presence
✅ **Easy maintenance** - Change one value to update all scenarios
✅ **Self-documenting** - Configuration objects clearly show all values
✅ **Consistent spacing** - legendGap ensures no overlap in any scenario

## Examples

### VPC Only
- Height: 50 + (15 + (40 + (50 + 70) + 15 + 15) + 15) + 25 + 15 = **340px**

### VPC + EKS
- Height: 50 + (15 + (40 + (50 + 70 + 5 + 80) + 15 + 15) + 15) + 25 + 15 = **425px**

### VPC + RDS
- Height: Same as VPC + EKS = **425px**

### VPC + EKS + RDS
- Height: 50 + (15 + (40 + (50 + 70 + 5 + 80 + 5 + 80) + 15 + 15) + 15) + 25 + 15 = **510px**

All scenarios maintain a consistent **25px gap** between environment blocks and legend.

## Testing

After adding a new component:

1. **Visual Test**: Select the component in the UI and verify spacing
2. **Combination Test**: Test with other components selected
3. **Multi-Environment Test**: Test with 1, 2, and 3 environments
4. **Theme Test**: Test in both light and dark modes

## Troubleshooting

### Legend Overlaps with Environment Blocks

Increase `GAPS.legendGap`:
```javascript
legendGap: 30,  // Increased from 25
```

### Components Too Close Together

Increase `GAPS.betweenComponents`:
```javascript
betweenComponents: 10,  // Increased from 5
```

### VPC Box Too Tight

Increase `GAPS.vpcPadding`:
```javascript
vpcPadding: 20,  // Increased from 15
```

## Migration Notes

### Old System (Before)
```javascript
const boxHeight = (hasEKS && hasRDS) ? 405 : (hasEKS || hasRDS) ? 325 : 240;
const vpcHeight = (hasEKS && hasRDS) ? 325 : (hasEKS || hasRDS) ? 245 : 160;
```

**Problems:**
- Required updating 2+ lines for each new component
- Nested ternary operators hard to read
- Easy to miss edge cases
- No clear documentation of spacing values

### New System (After)
```javascript
const COMPONENT_HEIGHTS = { subnet: 70, eks: 80, rds: 80 };
const GAPS = { legendGap: 25, ... };

let vpcContentHeight = COMPONENT_HEIGHTS.subnet;
if (hasEKS) vpcContentHeight += GAPS.afterSubnets + COMPONENT_HEIGHTS.eks;
if (hasRDS) vpcContentHeight += GAPS.betweenComponents + COMPONENT_HEIGHTS.rds;

const vpcHeight = GAPS.vpcHeader + vpcContentHeight;
const envBoxHeight = GAPS.envHeader + vpcHeight + GAPS.vpcPadding * 2;
```

**Benefits:**
- Single source of truth for all dimensions
- Self-documenting with named constants
- Easy to add new components (4 steps)
- Automatic height calculation
- Consistent spacing guaranteed

---

**Last Updated:** 2025-11-10
**Author:** Infrastructure Accelerator Team
**Related Files:** `docs/js/app.js` (updateDiagram function)
