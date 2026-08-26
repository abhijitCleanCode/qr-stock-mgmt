import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from "@/components/ui/empty";
import { useModal } from "@/components/shared/ModalProvider";
import VariantModal from "./VariantModal";

const variants = [];

const Variants = () => {
    const { openModal } = useModal();

    const handleAddVariant = () => openModal(VariantModal);

    if (variants.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-[#DEE4DE]">
                        <Plus />
                    </EmptyMedia>
                    <EmptyTitle>No Variants Yet</EmptyTitle>
                    <EmptyDescription>
                        Add a variant available for this design.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button type="button" className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors" onClick={handleAddVariant}>
                        <Plus />
                        Variant
                    </Button>
                </EmptyContent>
            </Empty>
        );
    }

    return null;
};

export default Variants;
