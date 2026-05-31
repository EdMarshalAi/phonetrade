import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { MotionReveal } from "@/components/ui/MotionReveal";

/** Trade-in блок из БД (передаётся с главной). */
export type TradeInPromoBlock = {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string | null;
};

const DEFAULT_BLOCK: TradeInPromoBlock = {
  title: "Trade-in и выкуп старых устройств",
  description:
    "Сдайте старое устройство и получите выгоду при покупке новых моделей Apple. Принимаем iPhone, iPad, Mac, Watch и AirPods.",
  buttonText: "Узнать вашу скидку",
  buttonLink: "/trade-in",
  imageUrl: null,
};

export function TradeInPromo({ block }: { block?: TradeInPromoBlock | null }) {
  const b = block ?? DEFAULT_BLOCK;
  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-16 pb-6 md:pb-10">
        <MotionReveal>
          <div className="group rounded-[2rem] md:rounded-[2.5rem] bg-ink text-white overflow-hidden">
            <div className="grid md:grid-cols-12 gap-6 md:gap-4 p-6 md:p-10 items-center">
              <div className="md:col-span-6">
                <p className="text-xs uppercase tracking-[0.16em] text-onDark-muted mb-4">
                  Trade-in
                </p>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.02]">
                  {b.title}
                </h2>
                <p className="mt-5 text-base md:text-lg text-onDark-muted max-w-xl">
                  {b.description}
                </p>
                <div className="mt-7">
                  <Link href={b.buttonLink || "/trade-in"}>
                    <Button variant="invert" size="lg">
                      {b.buttonText || "Узнать вашу скидку"}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:col-span-6">
                {b.imageUrl ? (
                  <div className="relative aspect-[4/3] md:aspect-[16/10]">
                    <Image
                      src={b.imageUrl}
                      alt={`${b.title} — Trade-in в Белгороде, PhoneTrade`}
                      fill
                      sizes="(max-width:768px) 100vw, 50vw"
                      className="object-contain object-bottom-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.04]"
                    />
                  </div>
                ) : (
                  <ImagePlaceholder
                    label="Apple Trade-in устройства"
                    tone="dark"
                    ratio="square"
                    className="bg-white/5"
                  />
                )}
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
