'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'

type StatusType = 'idle' | 'loading' | 'success' | 'error'

interface TransactionFormState {
  recipientId: string
  amount: string
  status: StatusType
  message: string
}

export default function TransactionForm() {
  const [formData, setFormData] = useState<TransactionFormState>({
    recipientId: '',
    amount: '',
    status: 'idle',
    message: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.recipientId.trim()) {
      setFormData(prev => ({
        ...prev,
        status: 'error',
        message: 'Please enter a recipient ID',
      }))
      return false
    }

    if (!formData.amount.trim()) {
      setFormData(prev => ({
        ...prev,
        status: 'error',
        message: 'Please enter an amount',
      }))
      return false
    }

    const amountNum = parseFloat(formData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormData(prev => ({
        ...prev,
        status: 'error',
        message: 'Amount must be a positive number',
      }))
      return false
    }

    return true
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setFormData(prev => ({
      ...prev,
      status: 'loading',
      message: 'Processing transaction...',
    }))

    try {
      // Call backend API
      const response = await fetch('/api/transfer-hbar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: formData.recipientId,
          amount: parseFloat(formData.amount),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setFormData({
          recipientId: '',
          amount: '',
          status: 'success',
          message: `Transaction successful! Transaction ID: ${data.transactionId || 'Pending'}`,
        })
      } else {
        setFormData(prev => ({
          ...prev,
          status: 'error',
          message: data.message || 'Transaction failed. Please try again.',
        }))
      }
    } catch (error) {
      console.error('Transaction error:', error)
      setFormData(prev => ({
        ...prev,
        status: 'error',
        message: 'An error occurred. Please check your connection and try again.',
      }))
    }
  }

  const resetStatus = () => {
    setFormData(prev => ({
      ...prev,
      status: 'idle',
      message: '',
    }))
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Send HBAR</CardTitle>
        <CardDescription>Transfer HBAR tokens on the Hedera network</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="recipientId" className="text-sm font-medium">
              Recipient ID
            </label>
            <Input
              id="recipientId"
              name="recipientId" // Changed from 'recipient' to 'recipientId'
              placeholder="Recipient ID, e.g., 0.0.12345"
              value={formData.recipientId} // Changed from 'recipient' to 'recipientId'
              onChange={handleInputChange}
              disabled={formData.status === 'loading'}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (HBAR)
            </label>
            <Input
              id="amount"
              name="amount"
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={formData.status === 'loading'}
              step="0.01"
              min="0"
              className="font-mono text-sm"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={formData.status === 'loading'}
            size="lg"
          >
            {formData.status === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </form>

        {/* Status Messages */}
        <div className="mt-6 space-y-3">
          {formData.status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Success</AlertTitle>
              <AlertDescription className="text-green-800">
                {formData.message}
              </AlertDescription>
              <button
                onClick={resetStatus}
                className="mt-2 text-sm font-medium text-green-700 hover:text-green-900 underline"
              >
                Send another transaction
              </button>
            </Alert>
          )}

          {formData.status === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900">Error</AlertTitle>
              <AlertDescription className="text-red-800">
                {formData.message}
              </AlertDescription>
              <button
                onClick={resetStatus}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </Alert>
          )}

          {formData.status === 'loading' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Processing</AlertTitle>
              <AlertDescription className="text-blue-800">
                {formData.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
