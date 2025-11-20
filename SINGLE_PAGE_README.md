# Single-Page Layout with Auth-Aware Navigation

This implementation converts the multi-page navigation into a single-page layout with sections, featuring an auth-aware navigation bar that adapts based on user login status.

## Features

### Single-Page Layout
- **Four sections**: `#home`, `#tips`, `#about`, `#contact`
- All sections are on one page, accessible via smooth scrolling
- Old routes (`/tips`, `/about`, `/contact`) automatically redirect to hash anchors

### Auth-Aware Navigation

#### When NOT logged in (Desktop):
- Full navigation bar with all links visible inline
- Logo on left, navigation links in center, login button on right

#### When logged in (Desktop):
- Minimized navigation bar
- Logo on left
- Quick access icons for Home and Tips (optional)
- Hamburger menu button
- User avatar
- Menu dropdown contains all navigation links

#### Mobile (Always):
- Always uses minimized style (hamburger menu)
- Compact navigation for better mobile UX

### Scrollspy
- Uses `IntersectionObserver` for performance
- Automatically highlights active section in navigation
- Smooth scrolling to sections when clicking nav links
- Updates URL hash without page reload
- Works with SSR and handles initial hash on page load

### Accessibility
- Keyboard navigable (Tab, Enter, Escape)
- Focus trapping in mobile menu
- `aria-current="page"` on active links
- `aria-expanded`, `aria-controls` for menu
- Skip-to-content link for keyboard users
- Visible focus rings on all interactive elements

## Files Created/Modified

### New Files
1. **`src/hooks/useScrollSpy.ts`**
   - Custom hook for scrollspy functionality
   - Uses IntersectionObserver for performance
   - Handles hash navigation and URL updates

2. **`src/components/NavBar.tsx`**
   - Auth-aware navigation component
   - Handles both full and minimized states
   - Mobile-responsive with hamburger menu
   - Includes accessibility features

3. **`src/pages/SinglePage.tsx`**
   - Single-page layout with all four sections
   - Integrates NavBar and scrollspy
   - Contains content from Home, Tips, About, and Contact

### Modified Files
1. **`src/App.tsx`**
   - Updated to use `SinglePage` component for home route
   - Added `HashRedirect` component for old route compatibility
   - Routes `/tips`, `/about`, `/contact` redirect to hash anchors

## Usage

### Testing Auth States

The navigation automatically detects auth state via `useAuth()` hook from `AuthContext`. To test different states:

1. **Not logged in**: Simply don't log in, or log out
2. **Logged in**: Log in through the app's authentication flow

The navigation will automatically switch between full and minimized modes.

### Manual Testing (if needed)

If you need to manually toggle auth state for testing, you can temporarily modify the `NavBar` component:

```tsx
// In NavBar.tsx, temporarily override:
const isLoggedIn = true; // or false for testing
```

### Hash Navigation

Users can navigate directly to sections using hash URLs:
- `/#home` - Home section
- `/#tips` - Tips section
- `/#about` - About section
- `/#contact` - Contact section

Old routes automatically redirect:
- `/tips` → `/#tips`
- `/about` → `/#about`
- `/contact` → `/#contact`

## Styling

The navigation uses:
- Glassmorphism effect (`bg-white/10 backdrop-blur-md`)
- Smooth transitions and animations
- Active link underline animation
- Responsive breakpoints (mobile at `< 768px`)

## Browser Support

- Modern browsers with IntersectionObserver support
- Graceful degradation for older browsers (will still work, just without scrollspy)

## Performance

- Uses IntersectionObserver instead of scroll events for better performance
- Debounced state updates
- Minimal re-renders with proper React hooks

## Future Enhancements

Potential improvements:
- Add compact floating table-of-contents for long Tips section
- Add more quick-access icons in minimized nav
- Add animation when switching between auth states
- Add section transition animations

