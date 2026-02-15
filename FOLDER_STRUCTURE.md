# Folder Structure

## Project Organization

This Next.js application is organized for scalability and modularity:

### `/app`
- **`layout.tsx`** - Root layout component with metadata and global setup
- **`page.tsx`** - Home page featuring the HBAR transaction form
- **`globals.css`** - Global styles with Tailwind CSS configuration

### `/app/api`
- **`send-hbar/route.ts`** - Backend API route for HBAR transactions
  - Handles POST requests for sending HBAR
  - Validates input parameters
  - Ready for Hedera SDK integration

### `/components`
- **`ui/`** - shadcn/ui components (buttons, inputs, cards, alerts, etc.)
  - Pre-built, accessible UI components

#### `/components/transaction`
- **`TransactionForm.tsx`** - Main form component for HBAR transfers
  - Form state management
  - Input validation
  - Error/success handling
  - Loading states

### `/hooks`
- Custom React hooks for shared logic
  - `use-toast.ts` - Toast notifications hook
  - `use-mobile.ts` - Mobile device detection

### `/lib`
- **`utils.ts`** - Utility functions (cn for classname merging)

### `/public`
- Static assets (images, icons, logos)

### `/styles`
- Additional stylesheets

---

## Future Expansion Paths

### Chat Interface (AI Agent)
```
/components/chat/
├── ChatInterface.tsx
├── ChatMessage.tsx
├── ChatInput.tsx
└── ChatHistory.tsx

/app/chat/
├── page.tsx
└── layout.tsx
```

### Transaction History
```
/components/history/
├── TransactionHistory.tsx
├── TransactionTable.tsx
└── TransactionFilters.tsx

/app/history/
└── page.tsx
```

### Wallet Integration
```
/components/wallet/
├── WalletConnect.tsx
├── WalletBalance.tsx
└── WalletSelector.tsx

/hooks/
├── use-wallet.ts
└── use-balance.ts

/lib/
├── hedera.ts (Hedera SDK wrapper)
└── wallet.ts (Wallet utilities)
```

### Account Settings
```
/components/settings/
├── SettingsForm.tsx
└── PreferencesPanel.tsx

/app/settings/
└── page.tsx
```

---

## Development Guidelines

1. **Components**: Keep components small and focused on a single responsibility
2. **State Management**: Use React hooks (useState, useContext) for local state
3. **API Routes**: Place all backend logic in `/app/api` directory
4. **Styling**: Use Tailwind CSS with consistent spacing and colors
5. **Types**: Define TypeScript interfaces for API requests/responses
6. **Error Handling**: Implement proper error messages for user feedback
