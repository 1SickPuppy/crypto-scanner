import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/crypto-scanner`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Scanner fejlede' }, { status: 500 })
    }
}