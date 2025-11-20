# Open Beauty Facts API v2 Integration Update

## Changes Made

### 1. **Updated to API v2** (with v0 fallback)
- Primary: Uses `/api/v2/product/{barcode}.json` for better data structure
- Fallback: Falls back to `/api/v0/product/{barcode}.json` if v2 fails
- Benefits: Better structured data, more fields available

### 2. **Improved Image Handling**
- Uses predictable image paths: `https://static.openbeautyfacts.org/images/products/{code}/front.{size}.jpg`
- Extracts both front and ingredients images
- Handles relative URLs properly
- Falls back to constructed URLs if image fields are missing

### 3. **Enhanced Data Extraction**
- **Periods After Opening**: Extracts `periods_after_opening` and `periods_after_opening_tags`
- **Better Ingredients**: Uses `ingredients_text` for INCI format, `ingredients` array for structured data
- **Categories**: Extracts from `categories_tags` properly
- **Last Modified**: Captures `last_modified_t` timestamp

### 4. **Schema Alignment**
- Sets `source: 'open_beauty_facts'` (matches our schema)
- Includes `images` object with `front` and `ingredients` URLs
- Includes `ingredients_inci` and `ingredients_raw` fields
- Includes `categories` array

## API Endpoints Used

### Product by Barcode
- **v2 (Primary)**: `https://world.openbeautyfacts.org/api/v2/product/{barcode}.json`
- **v0 (Fallback)**: `https://world.openbeautyfacts.org/api/v0/product/{barcode}.json`

### Search
- **Search Endpoint**: `https://world.openbeautyfacts.org/cgi/search.pl`
- Uses category tags like `en:shampoos`, `en:conditioners`

### Images
- **Base URL**: `https://static.openbeautyfacts.org/images`
- **Product Images**: `images/products/{code}/front.{size}.jpg`
- **Ingredients Images**: `images/products/{code}/ingredients.{size}.jpg`

## Data Structure Mapping

### Open Beauty Facts → Our Schema

| OBF Field | Our Field | Notes |
|-----------|-----------|-------|
| `code` | `id`, `barcode`, `upc` | Product barcode |
| `product_name` / `product_name_en` | `name` | Product name |
| `brands` | `brand` | First brand from array |
| `image_front_url` | `images.front` | Front product image |
| `image_ingredients_url` | `images.ingredients` | Ingredients label image |
| `ingredients_text` | `ingredients_inci` | Raw INCI text |
| `ingredients` | `ingredients_raw` | Structured ingredient array |
| `categories_tags` | `categories` | Product categories |
| `periods_after_opening` | `periodsAfterOpening` | Shelf life |
| `last_modified_t` | `last_modified_server` | Last update timestamp |

## Example API Response (v2)

```json
{
  "product": {
    "code": "3560070791460",
    "product_name": "Shampoo Name",
    "brands": "Brand Name",
    "image_front_url": "https://...",
    "image_ingredients_url": "https://...",
    "ingredients_text": "Aqua, Sodium Laureth Sulfate, ...",
    "ingredients": [
      {"text": "Aqua", "id": "en:water"},
      {"text": "Sodium Laureth Sulfate", "id": "en:sodium-laureth-sulfate"}
    ],
    "categories_tags": ["en:shampoos", "en:hair-care-products"],
    "periods_after_opening": "12 M",
    "periods_after_opening_tags": ["en:12-months"],
    "last_modified_t": 1712340000
  }
}
```

## Benefits

1. **Better Image Handling**: Predictable paths mean we can construct image URLs even if API doesn't return them
2. **More Data**: v2 API provides more structured data
3. **Backward Compatible**: Falls back to v0 if v2 unavailable
4. **Schema Alignment**: Better matches our expected product schema

## Testing

To test the updated adapter:

```typescript
// Test product by barcode
const adapter = new OpenBeautyFactsAdapter();
const product = await adapter.getProductByBarcode('3560070791460');
console.log('Product:', product);
console.log('Images:', product.images);
console.log('Ingredients:', product.ingredients_inci);
```

## Notes

- **Ingredients API**: Currently experimental, so we use `ingredients_text` and `ingredients` array
- **Image Paths**: Predictable structure allows fallback if API doesn't return image URLs
- **Rate Limits**: Still applies (~10 req/sec), use bulk dumps for mass syncs

