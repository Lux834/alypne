import { ClippingCalculator } from "@/components/ClippingCalculator";
import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Clipping calculator" };

export default function CalculatorPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">Creator tools</span><h1>Estimate campaign earnings.</h1><p>Adjust the inputs to explore how a rate, fee, and per-clip cap affect an estimated result.</p></div>
        <ClippingCalculator />
      </div>
    </MarketingLayout>
  );
}
