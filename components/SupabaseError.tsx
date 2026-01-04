import { AlertTriangle, Database } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SupabaseError() {
    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="max-w-md w-full border-2 border-dashed border-primary/20 bg-background shadow-2xl">
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Database className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Backend Not Connected</h2>
                        <p className="text-muted-foreground">
                            To use this feature, you must connect your Supabase project.
                            Please add your credentials to the `.env.local` file in the project root.
                        </p>
                    </div>
                    <div className="bg-muted p-4 rounded-xl text-left font-mono text-xs overflow-x-auto border">
                        NEXT_PUBLIC_SUPABASE_URL=...<br />
                        NEXT_PUBLIC_SUPABASE_ANON_KEY=...
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button asChild className="w-full">
                            <Link href="/">Back to Home</Link>
                        </Button>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pt-2">
                            Check the setup instructions in schema.sql
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
