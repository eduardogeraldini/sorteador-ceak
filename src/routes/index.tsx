import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHydrated } from "@/hooks/use-hydrated";
import logoUrl from "@/assets/ceak-conchal-logo.png";

const HISTORY_KEY = "ceak-sorteio-history";
const SETTINGS_KEY = "ceak-sorteio-settings";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sorteio de Números | Ceak Conchal" },
      {
        name: "description",
        content: "Realize sorteios de números de forma simples e rápida. Escolha a quantidade e o intervalo.",
      },
      {
        property: "og:title",
        content: "Sorteio de Números | Ceak Conchal",
      },
      {
        property: "og:description",
        content: "Realize sorteios de números de forma simples e rápida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type HistoryItem = {
  id: string;
  date: string;
  quantity: number;
  min: number;
  max: number;
  numbers: number[];
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function RollingDigit() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 100));
    }, 70);
    return () => clearInterval(interval);
  }, []);

  return <span className="font-heading text-2xl font-bold text-primary">{value}</span>;
}

function Index() {
  const hydrated = useHydrated();

  const [quantityInput, setQuantityInput] = useState("1");
  const [minInput, setMinInput] = useState("1");
  const [maxInput, setMaxInput] = useState("100");
  const [latestNumbers, setLatestNumbers] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { animationsEnabled?: boolean };
        if (typeof parsed.animationsEnabled === "boolean") {
          setAnimationsEnabled(parsed.animationsEnabled);
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ animationsEnabled }));
    } catch {
      // ignore storage errors
    }
  }, [animationsEnabled, hydrated]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore corrupt storage
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history, hydrated]);

  const handleDraw = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setError("");
    setLatestNumbers([]);
    setIsDrawing(false);

    const quantity = parseInt(quantityInput, 10);
    const min = parseInt(minInput, 10);
    const max = parseInt(maxInput, 10);

    if (Number.isNaN(quantity) || Number.isNaN(min) || Number.isNaN(max)) {
      setError("Preencha a quantidade e o intervalo com números válidos.");
      return;
    }

    if (quantity < 1) {
      setError("A quantidade deve ser pelo menos 1.");
      return;
    }

    if (min > max) {
      setError("O valor mínimo deve ser menor ou igual ao máximo.");
      return;
    }

    const available = max - min + 1;
    if (quantity > available) {
      setError(`Não é possível sortear ${quantity} números distintos no intervalo de ${min} a ${max}.`);
      return;
    }

    const pool = Array.from({ length: available }, (_, i) => min + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = temp;
    }

    const drawn = pool.slice(0, quantity).sort((a, b) => a - b);

    const item: HistoryItem = {
      id: generateId(),
      date: new Date().toISOString(),
      quantity,
      min,
      max,
      numbers: drawn,
    };

    if (animationsEnabled) {
      setIsDrawing(true);
      const rollTimer = setTimeout(() => {
        setIsDrawing(false);
        setLatestNumbers(drawn);
        setHistory((prev) => [item, ...prev].slice(0, 50));
      }, 900);
      timers.current.push(rollTimer);
      return;
    }

    setLatestNumbers(drawn);
    setHistory((prev) => [item, ...prev].slice(0, 50));
  };

  const clearHistory = () => {
    setHistory([]);
    setLatestNumbers([]);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cream/30 bg-card shadow-[0_20px_50px_rgba(107,58,42,0.15)]">
        {/* Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Configurações"
              className="absolute right-3 top-3 text-primary hover:bg-secondary"
            >
              <Settings className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <h3 className="font-heading text-base text-foreground">Configurações</h3>
            <div className="mt-4 flex items-center justify-between gap-4">
              <Label htmlFor="animations" className="text-sm font-medium">
                Animação do sorteio
              </Label>
              <Switch id="animations" checked={animationsEnabled} onCheckedChange={setAnimationsEnabled} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Quando ativada, os números giram antes de revelar o resultado.
            </p>
          </PopoverContent>
        </Popover>

        {/* Header & Logo */}
        <div className="flex flex-col items-center pt-10 pb-6">
          <img src={logoUrl} alt="Ceak Conchal" className="mb-3 h-20 w-auto object-contain" />
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">Ceak Conchal</h1>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Sorteador de Números</p>
        </div>

        {/* Draw Settings */}
        <div className="space-y-6 px-8 pb-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="quantity" className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Quantidade
              </Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="border-input bg-background text-lg font-medium text-foreground transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min" className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Mínimo
              </Label>
              <Input
                id="min"
                type="number"
                inputMode="numeric"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                className="border-input bg-background text-lg font-medium text-foreground transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max" className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Máximo
              </Label>
              <Input
                id="max"
                type="number"
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="border-input bg-background text-lg font-medium text-foreground transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Os números são sorteados sem repetição dentro do intervalo escolhido.
          </p>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button
            onClick={handleDraw}
            disabled={isDrawing}
            className="w-full bg-cream py-4 text-sm font-bold uppercase tracking-widest text-foreground shadow-lg transition-all active:scale-[0.98] hover:bg-gold hover:text-primary-foreground"
          >
            {isDrawing ? "Sorteando..." : "Sortear Agora"}
          </Button>
        </div>

        {/* Rolling animation */}
        {isDrawing && (
          <div className="mx-8 mb-8 rounded-2xl border-2 border-dashed border-cream bg-secondary p-8">
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({
                length: Math.min(Math.max(parseInt(quantityInput, 10) || 1, 1), 12),
              }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full border border-gold bg-card shadow-sm"
                >
                  <RollingDigit />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Result Area */}
        {latestNumbers.length > 0 && (
          <div
            className={`mx-8 mb-8 rounded-2xl border-2 border-dashed border-cream bg-secondary p-8 ${
              animationsEnabled ? "animate-fade-in" : ""
            }`}
          >
            <div className="mb-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Resultado Recente</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {latestNumbers.map((n, i) => (
                <div
                  key={n}
                  style={animationsEnabled ? { animationDelay: `${i * 70}ms` } : undefined}
                  className={`flex h-14 w-14 items-center justify-center rounded-full border border-gold bg-card shadow-sm ${
                    animationsEnabled ? "animate-scale-in" : ""
                  }`}
                >
                  <span className="font-heading text-2xl font-bold text-foreground">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History List */}
        <div className="px-8 pb-10">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Histórico</h2>
            <div className="h-px flex-1 bg-cream/40" />
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-8 gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum sorteio realizado ainda.</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-background bg-card p-3 transition-colors hover:border-cream/50"
                >
                  <span className="rounded bg-secondary px-2 py-1 font-heading text-xs text-primary">
                    {item.numbers.join(", ")}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm:ss")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
