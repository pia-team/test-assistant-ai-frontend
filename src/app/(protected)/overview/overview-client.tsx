"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  Sparkles,
  Code2,
  FileCode,
  BarChart3,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  Bot,
  FileJson,
  GitBranch,
  Monitor,
  ChevronRight,
  Globe,
  Target,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-context";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

interface OverviewClientProps {
  dictionary: Record<string, unknown>;
}

export function OverviewClient({ dictionary }: OverviewClientProps) {
  const { dictionary: dict } = useLocale();
  const o = dict.overview as Record<string, Record<string, string>>;
  const f = o?.features || {};
  const h = o?.howItWorks || {};
  const out = o?.outputs || {};
  const hero = o?.hero || {};
  const stats = o?.stats || {};
  const tech = o?.techStack || {};
  const cta = o?.cta || {};

  const features = [
    {
      icon: Bot,
      title: f.aiGeneration,
      description: f.aiGenerationDesc,
      gradient: "from-violet-500 to-purple-600",
      link: "/generate-tests",
    },
    {
      icon: FileJson,
      title: f.jsonAnalysis,
      description: f.jsonAnalysisDesc,
      gradient: "from-blue-500 to-cyan-500",
      link: "/upload-json",
    },
    {
      icon: Play,
      title: f.oneClickRun,
      description: f.oneClickRunDesc,
      gradient: "from-green-500 to-emerald-500",
      link: "/test-run",
    },
    {
      icon: BarChart3,
      title: f.allureReports,
      description: f.allureReportsDesc,
      gradient: "from-orange-500 to-amber-500",
      link: "/test-run",
    },
    {
      icon: Monitor,
      title: f.multiBrowser,
      description: f.multiBrowserDesc,
      gradient: "from-pink-500 to-rose-500",
      link: "/test-run",
    },
    {
      icon: GitBranch,
      title: f.autoIntegration,
      description: f.autoIntegrationDesc,
      gradient: "from-indigo-500 to-blue-600",
      link: "/generate-tests",
    },
  ];

  const steps = [
    {
      step: 1,
      icon: Globe,
      title: h.enterApi,
      description: h.enterApiDesc,
      color: "bg-violet-500",
    },
    {
      step: 2,
      icon: Sparkles,
      title: h.aiGenerates,
      description: h.aiGeneratesDesc,
      color: "bg-blue-500",
    },
    {
      step: 3,
      icon: Code2,
      title: h.addCode,
      description: h.addCodeDesc,
      color: "bg-green-500",
    },
    {
      step: 4,
      icon: Play,
      title: h.runTests,
      description: h.runTestsDesc,
      color: "bg-orange-500",
    },
    {
      step: 5,
      icon: BarChart3,
      title: h.analyzeResults,
      description: h.analyzeResultsDesc,
      color: "bg-pink-500",
    },
  ];

  const statItems = [
    { value: "10x", label: stats.fasterWriting, icon: Zap },
    { value: "%95", label: stats.codeCoverage, icon: Target },
    { value: "24/7", label: stats.autoTesting, icon: Clock },
    { value: "%100", label: stats.compatibility, icon: Shield },
  ];

  const outputTypes = [
    {
      name: out.featureFiles,
      description: out.featureFilesDesc,
      icon: FileCode,
    },
    {
      name: out.stepDefinitions,
      description: out.stepDefinitionsDesc,
      icon: Code2,
    },
    { name: out.apiTestData, description: out.apiTestDataDesc, icon: FileJson },
    {
      name: out.allureReports,
      description: out.allureReportsDesc,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="text-center space-y-8 py-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            {hero.subtitle}
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              CoTesterAI
            </span>
            <br />
            <span className="text-foreground">
              {hero.title?.replace("CoTesterAI ", "")}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {hero.description}
            <strong className="text-foreground">
              {" "}
              {hero.descriptionStrong}
            </strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/generate-tests">
              <Button size="lg" className="gap-2 px-8 h-12 text-base">
                <Rocket className="w-5 h-5" />
                {hero.getStarted}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-8 h-12 text-base"
              >
                {hero.learnMore}
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {statItems.map((stat, index) => (
              <div
                key={index}
                className="text-center p-4 rounded-xl bg-card/50 backdrop-blur border border-border/50"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="space-y-12">
        <motion.div className="text-center space-y-4" {...fadeInUp}>
          <Badge variant="outline" className="px-4 py-1">
            {f.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            {f.title?.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">
              {f.title?.split(" ").slice(-1)}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {f.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Link href={feature.link}>
                <Card className="h-full group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-primary/30">
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-primary text-sm font-medium">
                      {f.explore}
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="space-y-12 scroll-mt-20">
        <motion.div className="text-center space-y-4" {...fadeInUp}>
          <Badge variant="outline" className="px-4 py-1">
            {h.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="text-primary">
              {h.title?.split(" ").slice(0, 2).join(" ")}
            </span>{" "}
            {h.title?.split(" ").slice(2).join(" ")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {h.subtitle}
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-green-500 hidden md:block" />

            <motion.div
              className="space-y-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="relative flex gap-6 items-start"
                >
                  {/* Step Number */}
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center shadow-lg z-10`}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <Card className="flex-1 border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {h.step} {step.step}
                        </Badge>
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Output Types Section */}
      <section className="space-y-12">
        <motion.div className="text-center space-y-4" {...fadeInUp}>
          <Badge variant="outline" className="px-4 py-1">
            {out.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="text-primary">
              {out.title?.split(" ").slice(0, 1).join(" ")}
            </span>{" "}
            {out.title?.split(" ").slice(1).join(" ")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {out.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {outputTypes.map((output, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="h-full text-center p-6 hover:shadow-md transition-shadow border-border/50">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <output.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{output.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {output.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Code Preview Mock */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="overflow-hidden border-border/50">
            <div className="bg-zinc-900 p-4">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <pre className="text-sm text-zinc-300 overflow-x-auto">
                <code>{`Feature: User API Tests
  @smoke @api
  Scenario: Get user by ID
    Given the API is available at "/api/users"
    When I send a GET request to "/api/users/1"
    Then the response status should be 200
    And the response should contain "id" field
    And the response should contain "name" field

  @regression
  Scenario: Create new user
    Given I have user data with name "John Doe"
    When I send a POST request to "/api/users"
    Then the response status should be 201
    And the user should be created successfully`}</code>
              </pre>
            </div>
            <div className="p-4 bg-card border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileCode className="w-4 h-4" />
                <span>user-api.feature</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {out.generatedByAI}
              </Badge>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Technology Stack Section */}
      <section className="space-y-12">
        <motion.div className="text-center space-y-4" {...fadeInUp}>
          <Badge variant="outline" className="px-4 py-1">
            {tech.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            {tech.title?.split(" ").slice(0, 1).join(" ")}{" "}
            <span className="text-primary">
              {tech.title?.split(" ").slice(1).join(" ")}
            </span>
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {[
            "Playwright",
            "Cucumber",
            "TypeScript",
            "Gherkin",
            "Allure Reports",
            "Google AI",
            "Next.js",
            "Spring Boot",
          ].map((techItem, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {techItem}
            </Badge>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10 rounded-3xl" />
        </div>

        <motion.div
          className="text-center space-y-8 py-16 px-8 rounded-3xl border border-border/50"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600">
            <Rocket className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold">
            {cta.title?.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-primary">
              {cta.title?.split(" ").slice(-1)}
            </span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {cta.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/generate-tests">
              <Button size="lg" className="gap-2 px-8 h-12 text-base">
                <Sparkles className="w-5 h-5" />
                {cta.button}
              </Button>
            </Link>
            <Link href="/activities">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-8 h-12 text-base"
              >
                {cta.goToActivity}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
