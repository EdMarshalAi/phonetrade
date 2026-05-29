"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminButton, Field, TextInput, Select, FormError } from "@/components/admin/form";
import { Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { createManualOrder } from "./actions";

interface Product {
  id: string;
  title: string;
  price_cash: number;
}

interface OrderItem {
  productId: string;
  title: string;
  qty: number;
  price: number;
}

interface Prefill {
  name?: string;
  phone?: string;
  email?: string;
}

function money(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export function NewOrderForm({
  products,
  prefill,
}: {
  products: Product[];
  prefill?: Prefill;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Customer fields
  const [customerType, setCustomerType] = React.useState<"individual" | "legal">("individual");
  const [name, setName] = React.useState(prefill?.name ?? "");
  const [phone, setPhone] = React.useState(prefill?.phone ?? "");
  const [email, setEmail] = React.useState(prefill?.email ?? "");

  // Delivery / payment
  const [deliveryMethod, setDeliveryMethod] = React.useState<"pickup" | "courier">("pickup");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("sbp");

  // Items
  const [items, setItems] = React.useState<OrderItem[]>([
    { productId: "", title: "", qty: 1, price: 0 },
  ]);

  // Field-level validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const setItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const selectProduct = (index: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (p) {
      setItem(index, { productId: p.id, title: p.title, price: p.price_cash });
    } else {
      setItem(index, { productId: "", title: "", price: 0 });
    }
  };

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", title: "", qty: 1, price: 0 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const runningTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Укажите имя клиента";
    if (!phone.trim()) e.phone = "Укажите телефон";
    if (deliveryMethod === "courier" && !deliveryAddress.trim())
      e.deliveryAddress = "Укажите адрес доставки";
    if (items.length === 0) e.items = "Добавьте хотя бы одну позицию";
    for (let i = 0; i < items.length; i++) {
      if (!items[i].title.trim()) {
        e[`item_title_${i}`] = "Укажите название товара";
      }
      if (items[i].qty < 1) {
        e[`item_qty_${i}`] = "Кол-во ≥ 1";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setPending(true);
    try {
      const result = await createManualOrder({
        customerType,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "courier" ? deliveryAddress.trim() : undefined,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          title: it.title.trim(),
          qty: it.qty,
          price: it.price,
        })),
      });
      // createManualOrder redirects on success — if we get here it's an error
      if (result?.error) {
        setServerError(result.error);
        toast.error(result.error);
      }
    } catch {
      // redirect() throws — treat as success and let Next.js handle navigation
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError message={serverError} />

      {/* ── Клиент ─────────────────────────────────────────── */}
      <Panel>
        <PanelHeader><PanelTitle>Клиент</PanelTitle></PanelHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Тип клиента" htmlFor="customerType">
            <Select
              id="customerType"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as "individual" | "legal")}
            >
              <option value="individual">Физическое лицо</option>
              <option value="legal">Юридическое лицо</option>
            </Select>
          </Field>

          <Field label="Имя / Название" htmlFor="name" required error={errors.name}>
            <TextInput
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              hasError={!!errors.name}
            />
          </Field>

          <Field label="Телефон" htmlFor="phone" required error={errors.phone}>
            <TextInput
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              hasError={!!errors.phone}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email}>
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </Field>
        </div>
      </Panel>

      {/* ── Доставка и оплата ──────────────────────────────── */}
      <Panel>
        <PanelHeader><PanelTitle>Доставка и оплата</PanelTitle></PanelHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Способ получения" htmlFor="deliveryMethod">
            <Select
              id="deliveryMethod"
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "courier")}
            >
              <option value="pickup">Самовывоз</option>
              <option value="courier">Курьер</option>
            </Select>
          </Field>

          <Field label="Способ оплаты" htmlFor="paymentMethod">
            <Select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="sbp">СБП</option>
              <option value="card">Карта</option>
              <option value="on_delivery">При получении</option>
              <option value="installment">Рассрочка</option>
            </Select>
          </Field>

          {deliveryMethod === "courier" ? (
            <Field
              label="Адрес доставки"
              htmlFor="deliveryAddress"
              required
              error={errors.deliveryAddress}
              className="sm:col-span-2"
            >
              <TextInput
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Белгород, ул. Пример, д. 1, кв. 10"
                hasError={!!errors.deliveryAddress}
              />
            </Field>
          ) : null}
        </div>
      </Panel>

      {/* ── Состав заказа ──────────────────────────────────── */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Состав заказа</PanelTitle>
          {errors.items ? (
            <p className="text-[12px] text-sale">{errors.items}</p>
          ) : null}
        </PanelHeader>
        <div className="divide-y divide-border/60">
          {items.map((item, i) => (
            <div key={i} className="grid items-end gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
              {/* Product select */}
              <Field
                label={i === 0 ? "Товар" : undefined}
                htmlFor={`item_product_${i}`}
                error={errors[`item_title_${i}`]}
              >
                <Select
                  id={`item_product_${i}`}
                  value={item.productId}
                  onChange={(e) => selectProduct(i, e.target.value)}
                  hasError={!!errors[`item_title_${i}`]}
                >
                  <option value="">— выбрать товар —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Manual title if not from catalog */}
              <Field
                label={i === 0 ? "Название" : undefined}
                htmlFor={`item_title_${i}`}
                className="sm:w-48"
              >
                <TextInput
                  id={`item_title_${i}`}
                  value={item.title}
                  onChange={(e) => setItem(i, { title: e.target.value })}
                  placeholder="Название"
                />
              </Field>

              {/* Qty */}
              <Field
                label={i === 0 ? "Кол-во" : undefined}
                htmlFor={`item_qty_${i}`}
                error={errors[`item_qty_${i}`]}
                className="sm:w-20"
              >
                <TextInput
                  id={`item_qty_${i}`}
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) => setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                  hasError={!!errors[`item_qty_${i}`]}
                />
              </Field>

              {/* Price */}
              <Field
                label={i === 0 ? "Цена, ₽" : undefined}
                htmlFor={`item_price_${i}`}
                className="sm:w-28"
              >
                <TextInput
                  id={`item_price_${i}`}
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(e) => setItem(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                />
              </Field>

              {/* Remove button */}
              <div className={i === 0 ? "pb-0 pt-[22px]" : ""}>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={items.length === 1}
                  onClick={() => removeItem(i)}
                  className="text-ink-subtle hover:text-sale"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </AdminButton>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: add row + running total */}
        <div className="flex items-center justify-between gap-4 border-t border-border/70 px-4 py-3">
          <AdminButton type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Добавить позицию
          </AdminButton>
          <div className="text-[14px]">
            <span className="text-ink-muted">Итого:</span>{" "}
            <span className="font-semibold text-ink">{money(runningTotal)}</span>
          </div>
        </div>
      </Panel>

      {/* ── Submit ─────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/orders")}
          disabled={pending}
        >
          Отмена
        </AdminButton>
        <AdminButton type="submit" variant="primary" loading={pending} disabled={pending}>
          Создать заказ
        </AdminButton>
      </div>
    </form>
  );
}
