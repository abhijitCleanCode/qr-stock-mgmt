import { escapeHtml } from "./print.js";
import { inr, longDate } from "./format.js";

function metaCell(key, value) {
    return `<div><div class="k">${escapeHtml(key)}</div><div class="v">${escapeHtml(value || "—")}</div></div>`;
}

function partyMeta(party) {
    return [
        metaCell("Mobile", party.mobile),
        metaCell("City", party.city),
        metaCell("GST No.", party.gst),
        metaCell("Transport", party.transport),
        metaCell("Agent", party.agent),
    ].join("");
}

// Groups lines under their design, the way the paper form is written: a design heading, then its
// colours beneath it.
function groupByDesign(lines) {
    const groups = new Map();

    for (const line of lines) {
        const existing = groups.get(line.designId) ?? { designCode: line.designCode, designName: line.designName, lines: [] };
        existing.lines.push(line);
        groups.set(line.designId, existing);
    }

    return [...groups.values()];
}

export function orderFormHtml(form) {
    const body = groupByDesign(form.items).map((group) => `
        <tr class="group"><td colspan="3">${escapeHtml(group.designCode)} · ${escapeHtml(group.designName)}</td></tr>
        ${group.lines.map((line) => `
            <tr>
                <td>${escapeHtml(line.colorName)}</td>
                <td style="color:#64748B;font-family:ui-monospace,Menlo,monospace;font-size:11px;">${escapeHtml(line.designCode)}</td>
                <td class="n"><b>${line.quantityPcs}</b></td>
            </tr>`).join("")}
    `).join("");

    return `
    <div class="doc-head">
        <div>
            <div class="doc-title">Order Form</div>
            <div class="doc-sub">Customer requirement — checklist for dispatch</div>
        </div>
        <div>
            <div class="doc-no-label">Order form no.</div>
            <div class="doc-no">${escapeHtml(form.formNumber)}</div>
        </div>
    </div>
    <div class="meta">
        ${metaCell("Party", form.party.name)}
        ${metaCell("Date", longDate(form.formDate))}
        ${metaCell("Status", form.status === "INVOICED" ? `Invoiced (${form.invoice?.invoiceNumber ?? ""})` : form.status)}
        ${partyMeta(form.party)}
    </div>
    <table>
        <thead><tr><th>Colour</th><th>Design</th><th class="n">Required pcs</th></tr></thead>
        <tbody>
            ${body}
            <tr class="total"><td colspan="2">Total required</td><td class="n">${form.totalPcs}</td></tr>
        </tbody>
    </table>
    ${form.notes ? `<div class="notes"><b>Notes:</b> ${escapeHtml(form.notes)}</div>` : ""}
    <div class="sign"><div>Prepared by</div><div>Customer</div><div>Checked by</div></div>
    <div class="foot"><span>${escapeHtml(form.formNumber)}</span><span>Printed ${longDate(new Date().toISOString().slice(0, 10))}</span></div>`;
}

export function invoiceHtml(invoice) {
    const body = groupByDesign(invoice.lines).map((group) => `
        <tr class="group"><td colspan="6">${escapeHtml(group.designCode)} · ${escapeHtml(group.designName)}</td></tr>
        ${group.lines.map((line) => {
            const sizes = Object.entries(line.sizes).map(([label, count]) => `${label}:${count}`).join("  ");

            return `
            <tr>
                <td><b>${escapeHtml(line.colorName)}</b>${line.isExtra ? ' <span class="tag">EXTRA</span>' : ""}</td>
                <td style="font-size:11px;color:#475569;">${escapeHtml(line.packedAs)}</td>
                <td style="font-family:ui-monospace,Menlo,monospace;font-size:11px;">${escapeHtml(sizes)}</td>
                <td class="n">${line.pieces}</td>
                <td class="n">${inr(line.unitPrice)}</td>
                <td class="n"><b>${inr(line.amount)}</b></td>
            </tr>`;
        }).join("")}
    `).join("");

    return `
    <div class="doc-head">
        <div>
            <div class="doc-title">Invoice</div>
            <div class="doc-sub">Goods dispatched against order form ${escapeHtml(invoice.orderFormNumber ?? "")}</div>
        </div>
        <div>
            <div class="doc-no-label">Invoice no.</div>
            <div class="doc-no">${escapeHtml(invoice.invoiceNumber)}</div>
        </div>
    </div>
    <div class="meta">
        ${metaCell("Billed to", invoice.party.name)}
        ${metaCell("Invoice date", longDate(invoice.invoiceDate))}
        ${metaCell("Order form", invoice.orderFormNumber)}
        ${partyMeta(invoice.party)}
    </div>
    <table>
        <thead>
            <tr><th>Colour</th><th>Packed as</th><th>Sizes</th><th class="n">Pcs</th><th class="n">Rate / pc</th><th class="n">Amount</th></tr>
        </thead>
        <tbody>
            ${body}
            <tr class="total">
                <td colspan="3">Total</td>
                <td class="n">${invoice.totalPcs}</td>
                <td></td>
                <td class="n">${inr(invoice.totalAmount)}</td>
            </tr>
        </tbody>
    </table>
    <div class="sign"><div>Packed by</div><div>Checked by</div><div>Receiver's signature</div></div>
    <div class="foot">
        <span>${escapeHtml(invoice.invoiceNumber)} · ${escapeHtml(invoice.orderFormNumber ?? "")}</span>
        <span>Printed ${longDate(new Date().toISOString().slice(0, 10))}</span>
    </div>`;
}

export function orderFormCsvRows(form) {
    return [
        ["Order form no.", form.formNumber],
        ["Date", form.formDate],
        ["Party", form.party.name],
        ["Mobile", form.party.mobile],
        ["City", form.party.city],
        ["GST No.", form.party.gst],
        ["Transport", form.party.transport],
        ["Agent", form.party.agent],
        ["Status", form.status],
        [],
        ["Design", "Design name", "Colour", "Required pcs", "In stock"],
        ...form.items.map((item) => [item.designCode, item.designName, item.colorName, item.quantityPcs, item.availablePcs ?? ""]),
        [],
        ["Total", "", "", form.totalPcs, ""],
    ];
}

export function invoiceCsvRows(invoice) {
    return [
        ["Invoice no.", invoice.invoiceNumber],
        ["Date", invoice.invoiceDate],
        ["Order form", invoice.orderFormNumber],
        ["Party", invoice.party.name],
        ["Mobile", invoice.party.mobile],
        ["GST No.", invoice.party.gst],
        [],
        ["Design", "Colour", "Packed as", "Sizes", "Pcs", "Rate / pc", "Amount", "Extra"],
        ...invoice.lines.map((line) => [
            line.designCode,
            line.colorName,
            line.packedAs,
            Object.entries(line.sizes).map(([label, count]) => `${label}:${count}`).join(" "),
            line.pieces,
            line.unitPrice,
            line.amount,
            line.isExtra ? "YES" : "",
        ]),
        [],
        ["Total", "", "", "", invoice.totalPcs, "", invoice.totalAmount, ""],
        [],
        ["Scanned tags"],
        ["Tag", "Type", "Design", "Colour", "Pieces", "Sizes", "Method"],
        ...invoice.lines.flatMap((line) => line.tags.map((tag) => [
            tag.scanCode,
            tag.kind,
            line.designCode,
            line.colorName,
            tag.pieces,
            (tag.sizeBreakdown ?? []).map((size) => `${size.sizeLabel}:${size.quantity}`).join(" "),
            tag.method,
        ])),
    ];
}
