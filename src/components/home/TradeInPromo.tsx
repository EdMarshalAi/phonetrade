import * as React from "react";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { MotionReveal } from "@/components/ui/MotionReveal";

export function TradeInPromo() {
  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-16 pb-6 md:pb-10">
        <MotionReveal>
          <div className="rounded-[2rem] md:rounded-[2.5rem] bg-ink text-white overflow-hidden">
            <div className="grid md:grid-cols-12 gap-8 md:gap-6 p-8 md:p-14 items-center">
              <div className="md:col-span-7">
                <p className="text-xs uppercase tracking-[0.16em] text-onDark-muted mb-4">
                  Trade-in
                </p>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.02]">
                  Trade-in и выкуп
                  <br />
                  старых устройств
                </h2>
                <p className="mt-5 text-base md:text-lg text-onDark-muted max-w-xl">
                  Сдайте старое устройство и получите выгоду при покупке новых
                  моделей Apple. Принимаем iPhone, iPad, Mac, Watch и AirPods.
                </p>
                <div className="mt-7">
                  <Button variant="invert" size="lg">
                    Узнать вашу скидку
                  </Button>
                </div>
              </div>
              <div className="md:col-span-5">
                <ImagePlaceholder
                  label="Apple Trade-in устройства"
                  tone="dark"
                  ratio="square"
                  className="bg-white/5"
                />
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
