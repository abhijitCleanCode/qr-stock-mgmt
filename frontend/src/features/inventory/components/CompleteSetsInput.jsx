import { Input } from "@/components/ui/input";

const CompleteSetsInput = ({ value, onChange }) => {
  const handleChange = (event) => {
    const rawValue = event.target.value;
    if (rawValue === "") {
      onChange(0);
      return;
    }
    const parsed = parseInt(rawValue, 10);
    onChange(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="total-sets-received" className="text-sm font-medium text-foreground">
        Sets received
      </label>
      <Input
        id="total-sets-received"
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={handleChange}
        className="h-11 w-20 text-center text-base"
      />
    </div>
  );
};

export default CompleteSetsInput;
