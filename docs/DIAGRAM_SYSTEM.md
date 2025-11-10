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
    outerPadding: 15,     // Padding from outer container to environment boxes (top and sides)
    envHeader: 40,        // Space for environment name
    vpcPadding: 15,       // Padding inside VPC container
    vpcHeader: 50,        // Space for VPC name and CIDR
    afterSubnets: 5,      // Gap after subnet blocks
    betweenComponents: 5, // Gap between components (EKS, RDS, etc.)
    afterLastComponent: 10, // Gap after last component before VPC bottom
    legendHeight: 6,      // Height reserved for legend (accounts for text descent ~4px)
    legendPadding: 20,    // Padding above legend (space between env blocks and legend)
    legendBottomPadding: 0, // No padding - text descent provides natural ~2px spacing
};
```

### Height Calculation Flow

```
totalHeight
  └─ 50 (header)
  └─ outerHeight
      └─ outerPadding (15px) - top
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
                  └─ afterLastComponent gap (10px)
              └─ vpcPadding (15px)
          └─ vpcPadding (15px)
      └─ legendPadding (20px)
      └─ legendHeight (6px) - accounts for text descent
      └─ legendBottomPadding (0px) - text descent provides ~2px natural spacing
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
✅ **Consistent spacing** - legendPadding ensures no overlap in any scenario

## Examples

### VPC Only
- vpcContentHeight: 70 (subnet) + 10 (afterLastComponent) = 80
- vpcHeight: 50 (vpcHeader) + 80 = 130
- envBoxHeight: 40 (envHeader) + 130 + 15×2 (vpcPadding) = 200
- outerHeight: 200 + 15 (outerPadding) + 20 (legendPadding) + 6 (legendHeight) + 0 (legendBottomPadding) = 241
- totalHeight: 50 (header) + 241 = **291px**
- **Visual bottom gap: 6 + 0 - 4 (text descent) = ~2px** ✓

### VPC + EKS
- vpcContentHeight: 70 + 5 (afterSubnets) + 80 (eks) + 10 (afterLastComponent) = 165
- vpcHeight: 50 + 165 = 215
- envBoxHeight: 40 + 215 + 30 = 285
- outerHeight: 285 + 15 + 20 + 6 + 0 = 326
- totalHeight: 50 + 326 = **376px**
- **Visual bottom gap: ~2px** ✓

### VPC + RDS
- Same as VPC + EKS = **376px**
- **Visual bottom gap: ~2px** ✓

### VPC + EKS + RDS
- vpcContentHeight: 70 + 5 + 80 + 5 (betweenComponents) + 80 (rds) + 10 = 250
- vpcHeight: 50 + 250 = 300
- envBoxHeight: 40 + 300 + 30 = 370
- outerHeight: 370 + 15 + 20 + 6 + 0 = 411
- totalHeight: 50 + 411 = **461px**
- **Visual bottom gap: ~2px** ✓

All scenarios maintain **20px padding above legend** and **~2px visual gap below** (via text descent).

## Testing

After adding a new component:

1. **Visual Test**: Select the component in the UI and verify spacing
2. **Combination Test**: Test with other components selected
3. **Multi-Environment Test**: Test with 1, 2, and 3 environments
4. **Theme Test**: Test in both light and dark modes

## Troubleshooting

### Legend Overlaps with Environment Blocks

Increase `GAPS.legendPadding`:
```javascript
legendPadding: 25,  // Increased from 20
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

### VPC Box Touches Components at Bottom

Increase `GAPS.afterLastComponent`:
```javascript
afterLastComponent: 15,  // Increased from 10
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
const GAPS = {
    outerPadding: 15, envHeader: 40, vpcPadding: 15, vpcHeader: 50,
    afterSubnets: 5, betweenComponents: 5, afterLastComponent: 10,
    legendHeight: 6, legendPadding: 20, legendBottomPadding: 0
};

let vpcContentHeight = COMPONENT_HEIGHTS.subnet;
if (hasEKS) vpcContentHeight += GAPS.afterSubnets + COMPONENT_HEIGHTS.eks;
if (hasRDS) vpcContentHeight += GAPS.betweenComponents + COMPONENT_HEIGHTS.rds;
vpcContentHeight += GAPS.afterLastComponent;

const vpcHeight = GAPS.vpcHeader + vpcContentHeight;
const envBoxHeight = GAPS.envHeader + vpcHeight + GAPS.vpcPadding * 2;
const outerHeight = envBoxHeight + GAPS.outerPadding + GAPS.legendPadding + GAPS.legendHeight + GAPS.legendBottomPadding;
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
