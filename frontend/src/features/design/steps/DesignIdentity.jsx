import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "react-toastify";

import CustomFormField from "@/components/shared/form/CustomFormField";
import { FormFieldType } from "@/config/FormFieldType";
import JobberSearchInput from "../components/JobberSearchInput";
import QualitySearchInput from "../components/QualitySearchInput";
import PatternSearchInput from "../components/PatternSearchInput";
import { useExistingDesignByCode } from "../hooks/useExistingDesignByCode";

const CODE_CHECK_DEBOUNCE_MS = 400;

// Enforces "<letters> <digits>" (e.g. "KP 100"): letters accumulate until the first digit is
// typed, at which point a space is auto-inserted and only digits are accepted from then on.
// Anything else typed (hyphens, letters after a digit, extra spaces) is silently dropped.
const formatDesignCode = (raw) => {
  let letters = "";
  let digits = "";
  let seenDigit = false;

  for (const char of raw) {
    if (!seenDigit && /[a-zA-Z]/.test(char)) {
      letters += char;
    } else if (/[0-9]/.test(char)) {
      seenDigit = true;
      digits += char;
    }
  }

  if (!letters) return digits;
  return seenDigit ? `${letters} ${digits}` : letters;
};

const DesignIdentity = ({ control, setExistingDesignByCode, editDesign }) => {
  const codeValue = useWatch({ control, name: "code" });
  const [debouncedCode, setDebouncedCode] = useState("");
  const lastWarnedCode = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedCode(codeValue ?? ""), CODE_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [codeValue]);

  const { data: matchedDesign } = useExistingDesignByCode(debouncedCode);
  // While editing, the design's own code is not a duplicate.
  const existingDesign = matchedDesign && matchedDesign.id !== editDesign?.id ? matchedDesign : null;

  useEffect(() => {
    setExistingDesignByCode?.(existingDesign ?? null);

    if (existingDesign && lastWarnedCode.current !== existingDesign.code) {
      toast.warn(`Design code "${existingDesign.code}" already exists. Wanna continue?`);
      lastWarnedCode.current = existingDesign.code;
    }
  }, [existingDesign, setExistingDesignByCode]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <CustomFormField
        control={control}
        name="itemName"
        label="Item Name"
        fieldType={FormFieldType.INPUT}
      />
      <div>
        <CustomFormField
          control={control}
          name="code"
          label="Design Code"
          fieldType={FormFieldType.INPUT}
          format={formatDesignCode}
        />
        {existingDesign && (
          <p className="mt-1 text-sm text-amber-600">
            Design code exists, wanna continue?
          </p>
        )}
      </div>
      <JobberSearchInput label="Jobber Name" />
      <PatternSearchInput label="Pattern Name" />
      <QualitySearchInput />
      <CustomFormField
        control={control}
        name="defaultSellingPricePerPiece"
        label="Selling price / piece"
        fieldType={FormFieldType.INPUT}
      />
      <div className="md:col-span-2">
        <CustomFormField
          control={control}
          name="notes"
          label="Notes"
          fieldType={FormFieldType.TEXTAREA}
        />
      </div>
    </div>
  );
};

export default DesignIdentity;
