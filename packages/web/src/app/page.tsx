import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Calendar,
  CheckSquare,
  Zap,
  Lock,
  Globe,
} from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const features = [
    {
      icon: Calendar,
      title: "Smart Calendar Integration",
      description:
        "Sync with Google Calendar to manage your schedule effortlessly",
    },
    {
      icon: CheckSquare,
      title: "Jira Task Management",
      description:
        "Connect with Jira to track and manage your development workflow",
    },
    {
      icon: Zap,
      title: "AI-Powered Automation",
      description:
        "Let AI handle routine tasks while you focus on what matters",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description:
        "Bank-grade security with Auth0 authentication and encryption",
    },
    {
      icon: Globe,
      title: "Cross-Platform Access",
      description: "Access your workspace from any device, anywhere",
    },
  ]

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for trying out Terapotik",
      features: [
        "Up to 5 calendar events",
        "Basic task management",
        "1 integration",
        "Community support",
      ],
    },
    {
      name: "Pro",
      price: "$15",
      description: "For power users and small teams",
      features: [
        "Unlimited calendar events",
        "Advanced task management",
        "5 integrations",
        "Email support",
        "Custom workflows",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For organizations at scale",
      features: [
        "All Pro features",
        "Unlimited integrations",
        "SSO & advanced security",
        "Priority support",
        "Custom development",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">T</span>
            </div>
            <span className="text-xl font-bold">Terapotik</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="container mx-auto px-4 py-24 text-center">
        <Badge className="mb-6" variant="secondary">
          New: AI-powered task automation
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-3xl mx-auto">
          Manage Your Tasks and Calendar with AI-Powered Efficiency
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Terapotik combines calendar management, task tracking, and AI
          automation to help you stay productive and organized.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Stay Organized
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <Icon className="w-10 h-10 mb-4 text-primary" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? "border-primary" : ""}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.price !== "Custom" && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/login">
                    <Button
                      className="w-full mt-8"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.price === "Custom"
                        ? "Contact Sales"
                        : "Get Started"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who use Terapotik to stay organized
            and productive.
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                T
              </span>
            </div>
            <span className="font-semibold">Terapotik</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Terapotik. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
