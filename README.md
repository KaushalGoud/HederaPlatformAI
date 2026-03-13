# Hedera HBAR Transaction App

A clean, responsive Next.js frontend application for sending HBAR tokens on the Hedera network. Built with React, TypeScript, and Tailwind CSS.

## Features

✨ **Clean & Responsive UI**
- Centered, mobile-friendly form layout
- Real-time input validation
- Loading states with spinner animations
- Success/error message display

🔌 **Backend Ready**
- Placeholder API route (`/api/send-hbar`) for easy integration
- TypeScript types for request/response validation
- Error handling and logging

📦 **Well-Organized Structure**
- Modular component architecture
- Separated concerns (UI, API, hooks, utilities)
- Ready for future expansion (chat interface, transaction history, wallet integration)

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

1. **Clone and install dependencies:**
```bash
pnpm install
```

2. **Run the development server:**
```bash
pnpm dev
```

3. **Open in browser:**
Navigate to `http://localhost:3000`

## Usage

### Frontend Testing (Dummy Data)

The form is fully functional with built-in validation:

1. Enter a recipient ID (e.g., `0.0.12345`)
2. Enter an amount (e.g., `100`)
3. Click "Send"
4. See success/error messages

The API route includes a 1-second delay simulation to test loading states.

### Backend Integration

To connect the Hedera SDK:

1. **Install Hedera SDK:**
```bash
pnpm add @hashgraph/sdk
```

2. **Update `/app/api/send-hbar/route.ts`:**
```typescript
import { Client, TransferTransaction, AccountId, Hbar } from '@hashgraph/sdk'

export async function POST(request: NextRequest) {
  const body: SendHBARRequest = await request.json()
  
  // Initialize Hedera client
  const client = Client.forTestnet() // or forMainnet()
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!),
    process.env.HEDERA_PRIVATE_KEY!
  )
  
  try {
    // Create and submit transaction
    const transaction = await new TransferTransaction()
      .addHbarTransfer(process.env.HEDERA_ACCOUNT_ID!, Hbar.from(-body.amount))
      .addHbarTransfer(body.recipientId, Hbar.from(body.amount))
      .execute(client)
    
    const receipt = await transaction.getReceipt(client)
    
    return NextResponse.json({
      success: true,
      transactionId: transaction.transactionId.toString(),
      message: `Transaction successful`,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Transaction failed',
    }, { status: 500 })
  }
}
```

3. **Add environment variables** in `.env.local`:
```
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=your_private_key
HEDERA_NETWORK=testnet
```

## Project Structure

```
hedera-hbar-app/
├── app/
│   ├── api/
│   │   └── send-hbar/
│   │       └── route.ts          # API endpoint for HBAR transfers
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── transaction/
│       └── TransactionForm.tsx    # Main form component
├── hooks/                          # Custom React hooks
├── lib/                            # Utilities
├── public/                         # Static assets
└── README.md
```

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for detailed organization and expansion paths.

## API Documentation

### POST `/api/send-hbar`

Sends HBAR tokens to a recipient.

**Request:**
```json
{
  "recipientId": "0.0.12345",
  "amount": 100
}
```

**Response (Success):**
```json
{
  "success": true,
  "transactionId": "0x...",
  "message": "Successfully sent 100 HBAR to 0.0.12345"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Validation

The form validates:
- ✅ Recipient ID is not empty
- ✅ Amount is provided and is a positive number
- ✅ API responses and error handling

## Styling

- **Framework:** Tailwind CSS
- **Components:** shadcn/ui
- **Responsive:** Mobile-first design
- **Colors:** Clean, minimal palette (background, primary, secondary, accent, destructive)

## Future Enhancements

- [ ] Chat interface for AI agent
- [ ] Transaction history and lookup
- [ ] Wallet integration (HashPack, Blade)
- [ ] Multi-account support
- [ ] Transaction status tracking
- [ ] Real-time gas fee estimation

## Development

### File Structure for New Features

When adding new features, follow the established patterns:

1. **Create UI component** in `/components/<feature>/`
2. **Create API route** in `/app/api/<feature>/` if needed
3. **Add hooks** in `/hooks/use-<feature>.ts` if needed
4. **Add page** in `/app/<feature>/page.tsx` if it's a separate route

### Code Style

- Use TypeScript for type safety
- Follow React best practices (hooks, functional components)
- Use Tailwind CSS utility classes
- Add proper error handling and validation

## Support

For issues with:
- **Hedera SDK:** Check [Hedera documentation](https://docs.hedera.com)
- **Next.js:** See [Next.js docs](https://nextjs.org/docs)
- **Tailwind:** Visit [Tailwind CSS docs](https://tailwindcss.com/docs)

## License

MIT
0.0.7932544