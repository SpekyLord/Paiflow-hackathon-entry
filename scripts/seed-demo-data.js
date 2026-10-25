// CYFER: Insert production demo data with correct blockchain hashes
// Run: node --env-file=.env.local scripts/seed-demo-data.js

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");

// Usage: node --env-file=.env.local scripts/seed-demo-data.js
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Run with: node --env-file=.env.local scripts/seed-demo-data.js");
  process.exit(1);
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashString(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function computeBlockHash(block) {
  const ts = new Date(block.timestamp).getTime();
  const keys = Object.keys(block.data).sort();
  const dataSorted = JSON.stringify(block.data, keys);
  return hashString(
    String(block.id) +
      String(ts) +
      dataSorted +
      block.previous_hash +
      String(block.nonce)
  );
}

const MAYOR = "d471eda7-f4a7-42ab-b835-541756fce3e3";
const TREASURER = "159291dd-7701-4264-995b-6e31295bf930";
const CLERK = "c28d6485-36a0-42ef-b144-6ebf4fab3ad0";

const now = Date.now();
const DAY = 86400000;

const documents = [
  {
    id: "55555555-5555-5555-5555-555555555555",
    title:
      "Annual Budget Appropriation FY 2026 - Municipality of Sample City",
    category: "budget",
    description:
      "The annual general appropriations for the Municipality of Sample City for Fiscal Year 2026, allocating PHP 60,000,000 across 8 sectors including infrastructure, health, education, and social services.",
    file_name: "annual-budget-fy2026.pdf",
    file_ext: ".pdf",
    file_size: 512000,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/annual-budget-fy2026.pdf",
    file_hash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    uploaded_by: MAYOR,
    status: "published",
    published_at: new Date(now - 5 * DAY).toISOString(),
    created_at: new Date(now - 8 * DAY).toISOString(),
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    title:
      "Resolution No. 2026-05: Road Improvement Project Barangay San Isidro",
    category: "resolution",
    description:
      "A resolution authorizing the implementation of the road improvement project in Barangay San Isidro, with a total project cost of PHP 3,500,000 funded from the infrastructure budget allocation.",
    file_name: "resolution-2026-05-road-improvement.pdf",
    file_ext: ".pdf",
    file_size: 198400,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/resolution-2026-05-road-improvement.pdf",
    file_hash:
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    uploaded_by: TREASURER,
    status: "published",
    published_at: new Date(now - 4 * DAY).toISOString(),
    created_at: new Date(now - 6 * DAY).toISOString(),
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    title: "Contract: Medical Supplies Procurement Q1 2026",
    category: "contract",
    description:
      "Procurement contract for medical supplies and equipment for the Municipal Health Office covering January to March 2026. Total contract value: PHP 1,200,000.",
    file_name: "contract-medical-supplies-q1-2026.pdf",
    file_ext: ".pdf",
    file_size: 345600,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/contract-medical-supplies-q1-2026.pdf",
    file_hash:
      "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    uploaded_by: MAYOR,
    status: "published",
    published_at: new Date(now - 3 * DAY).toISOString(),
    created_at: new Date(now - 5 * DAY).toISOString(),
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    title:
      "Environmental Compliance Certificate: Waste Management Facility",
    category: "permit",
    description:
      "Environmental compliance certificate issued for the new waste management and recycling facility in Barangay Rizal.",
    file_name: "ecc-waste-management-2026.pdf",
    file_ext: ".pdf",
    file_size: 278000,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/ecc-waste-management-2026.pdf",
    file_hash:
      "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
    uploaded_by: CLERK,
    status: "published",
    published_at: new Date(now - 2 * DAY).toISOString(),
    created_at: new Date(now - 4 * DAY).toISOString(),
  },
  {
    id: "99999999-9999-9999-9999-999999999999",
    title:
      "Ordinance No. 2026-03: Anti-Littering and Clean Streets Program",
    category: "ordinance",
    description:
      "An ordinance establishing the Clean Streets Program for the Municipality of Sample City, imposing penalties for littering.",
    file_name: "ordinance-2026-03-clean-streets.pdf",
    file_ext: ".pdf",
    file_size: 189000,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/ordinance-2026-03-clean-streets.pdf",
    file_hash:
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    uploaded_by: MAYOR,
    status: "published",
    published_at: new Date(now - 1 * DAY).toISOString(),
    created_at: new Date(now - 3 * DAY).toISOString(),
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    title: "Resolution No. 2026-08: Senior Citizen Discount Extension",
    category: "resolution",
    description:
      "A resolution extending the 20% senior citizen discount to include additional services.",
    file_name: "resolution-2026-08-senior-discount.pdf",
    file_ext: ".pdf",
    file_size: 156000,
    file_url:
      "https://hlwddxqdnrrgztgjnwbv.supabase.co/storage/v1/object/public/documents/demo/resolution-2026-08-senior-discount.pdf",
    file_hash:
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    uploaded_by: TREASURER,
    status: "pending_approval",
    published_at: null,
    created_at: new Date(now - 1 * DAY).toISOString(),
  },
];

const publishedDocIds = [
  "55555555-5555-5555-5555-555555555555",
  "66666666-6666-6666-6666-666666666666",
  "77777777-7777-7777-7777-777777777777",
  "88888888-8888-8888-8888-888888888888",
  "99999999-9999-9999-9999-999999999999",
];

const approvalMessages = {
  [MAYOR]: [
    "Budget allocations are properly distributed. Approved.",
    "Infrastructure project aligns with development plan.",
    "Procurement follows PhilGEPS procedures. Approved.",
    "Environmental impact assessment is thorough. Approved.",
    "Clean Streets Program will improve our city image. Fully approved.",
  ],
  [TREASURER]: [
    "Treasury review complete. All figures verified.",
    "Budget allocation confirmed from infrastructure fund.",
    "Contract value within health budget allocation. Approved.",
    "Approved. Budget for mitigation measures accounted for.",
    "Minimal budget impact. Approved.",
  ],
  [CLERK]: [
    "Approved after review. Consistent with prior year adjustments.",
    "Legal review passed. Approved.",
    "Approved. Supplies list verified against health office request.",
    "Compliance with DENR requirements confirmed. Approved.",
    "Legal framework is sound. Penalties are reasonable. Approved.",
  ],
};

(async () => {
  console.log("=== CYFER Demo Data Seeder ===\n");

  // 1. Insert documents
  const { data: docs, error: docErr } = await supabase
    .from("documents")
    .upsert(documents, { onConflict: "id" })
    .select("id, title");
  if (docErr) {
    console.error("DOC ERROR:", docErr.message);
    return;
  }
  console.log("Documents inserted:", docs.length);

  // 2. Insert approvals
  const approvals = [];
  publishedDocIds.forEach((docId, i) => {
    [MAYOR, TREASURER, CLERK].forEach((adminId) => {
      approvals.push({
        document_id: docId,
        admin_id: adminId,
        status: "approved",
        message: approvalMessages[adminId][i],
        responded_at: new Date(now - (6 - i) * DAY).toISOString(),
        created_at: new Date(now - (8 - i) * DAY).toISOString(),
      });
    });
  });
  // Pending approvals for senior discount
  approvals.push({
    document_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    admin_id: MAYOR,
    status: "pending",
    message: null,
    responded_at: null,
    created_at: new Date(now - 1 * DAY).toISOString(),
  });
  approvals.push({
    document_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    admin_id: TREASURER,
    status: "approved",
    message: "Budget impact is manageable. Approved from treasury.",
    responded_at: new Date(now - 0.5 * DAY).toISOString(),
    created_at: new Date(now - 1 * DAY).toISOString(),
  });
  approvals.push({
    document_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    admin_id: CLERK,
    status: "pending",
    message: null,
    responded_at: null,
    created_at: new Date(now - 1 * DAY).toISOString(),
  });

  const { error: appErr } = await supabase
    .from("approvals")
    .insert(approvals);
  if (appErr) {
    console.error("APPROVAL ERROR:", appErr.message);
  } else {
    console.log("Approvals inserted:", approvals.length);
  }

  // 3. Add blockchain blocks with proper hash chaining
  // Get the actual last block from DB to chain correctly
  const { data: lastBlockArr } = await supabase
    .from("blockchain")
    .select("*")
    .order("id", { ascending: false })
    .limit(1);
  let prevHash = lastBlockArr[0].hash;
  let blockId = lastBlockArr[0].id + 1;
  console.log(
    "\nChaining from block",
    lastBlockArr[0].id,
    "hash:",
    prevHash.slice(0, 16) + "..."
  );

  for (let i = 0; i < publishedDocIds.length; i++) {
    const blockData = {
      action: "document_published",
      document_id: publishedDocIds[i],
      file_hash: documents[i].file_hash,
      title: documents[i].title,
      total_approvals: 3,
    };
    const timestamp = new Date(now - (5 - i) * DAY).toISOString();
    const nonce = Math.floor(Math.random() * 1000000);
    const block = {
      id: blockId + i,
      timestamp,
      data: blockData,
      previous_hash: prevHash,
      nonce,
    };
    const hash = computeBlockHash(block);

    const { error: bErr } = await supabase
      .from("blockchain")
      .insert({ ...block, hash });
    if (bErr) {
      console.error("BLOCK ERROR:", bErr.message);
    } else {
      console.log("Block", block.id, "inserted, hash:", hash.slice(0, 16) + "...");
    }
    prevHash = hash;
  }

  // 4. Add transaction audit trail
  const { data: lastTxArr } = await supabase
    .from("transactions")
    .select("tx_hash")
    .order("created_at", { ascending: false })
    .limit(1);
  let prevTxHash = lastTxArr[0].tx_hash;

  const txEntries = [];
  const uploaders = [
    "Mayor Juan Santos",
    "Treasurer Maria Cruz",
    "Mayor Juan Santos",
    "Municipal Secretary Pedro Reyes",
    "Mayor Juan Santos",
  ];

  for (let i = 0; i < 5; i++) {
    const docId = publishedDocIds[i];
    const title = documents[i].title;

    // Upload
    let txHash = hashString(prevTxHash + "upload" + docId + (now - (8 - i) * DAY));
    txEntries.push({
      action_type: "upload",
      description: "Document uploaded: " + title,
      document_id: docId,
      performed_by: uploaders[i],
      tx_hash: txHash,
      previous_tx_hash: prevTxHash,
      created_at: new Date(now - (8 - i) * DAY).toISOString(),
    });
    prevTxHash = txHash;

    // Approve
    txHash = hashString(prevTxHash + "approve" + docId + (now - (6 - i) * DAY));
    txEntries.push({
      action_type: "approve",
      description: "Document approved by all officials",
      document_id: docId,
      performed_by: "System",
      tx_hash: txHash,
      previous_tx_hash: prevTxHash,
      created_at: new Date(now - (6 - i) * DAY).toISOString(),
    });
    prevTxHash = txHash;

    // Publish
    txHash = hashString(prevTxHash + "publish" + docId + (now - (5 - i) * DAY));
    txEntries.push({
      action_type: "publish",
      description: "Document published: " + title,
      document_id: docId,
      performed_by: "System",
      tx_hash: txHash,
      previous_tx_hash: prevTxHash,
      created_at: new Date(now - (5 - i) * DAY).toISOString(),
    });
    prevTxHash = txHash;
  }

  // Verification events
  let txHash = hashString(prevTxHash + "verify-citizen-budget");
  txEntries.push({
    action_type: "verify",
    description:
      "Document verified by citizen: Annual Budget Appropriation FY 2026",
    document_id: "55555555-5555-5555-5555-555555555555",
    performed_by: "public",
    tx_hash: txHash,
    previous_tx_hash: prevTxHash,
    created_at: new Date(now - 3 * DAY).toISOString(),
  });
  prevTxHash = txHash;

  txHash = hashString(prevTxHash + "verify-tamper-detected");
  txEntries.push({
    action_type: "verify",
    description: "Tampered document detected: hash mismatch for unknown file",
    document_id: null,
    performed_by: "public",
    tx_hash: txHash,
    previous_tx_hash: prevTxHash,
    created_at: new Date(now - 2 * DAY).toISOString(),
  });
  prevTxHash = txHash;

  // Pending doc
  txHash = hashString(prevTxHash + "upload-senior-discount");
  txEntries.push({
    action_type: "upload",
    description:
      "Document uploaded: Resolution No. 2026-08 Senior Citizen Discount Extension (pending approval)",
    document_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    performed_by: "Treasurer Maria Cruz",
    tx_hash: txHash,
    previous_tx_hash: prevTxHash,
    created_at: new Date(now - 1 * DAY).toISOString(),
  });
  prevTxHash = txHash;

  txHash = hashString(prevTxHash + "approve-senior-discount-treasurer");
  txEntries.push({
    action_type: "approve",
    description:
      "Document approved by Treasurer Maria Cruz (1 of 3 required)",
    document_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    performed_by: "Treasurer Maria Cruz",
    tx_hash: txHash,
    previous_tx_hash: prevTxHash,
    created_at: new Date(now - 0.5 * DAY).toISOString(),
  });

  const { error: txErr } = await supabase
    .from("transactions")
    .insert(txEntries);
  if (txErr) {
    console.error("TX ERROR:", txErr.message);
  } else {
    console.log("Transactions inserted:", txEntries.length);
  }

  // 5. Validate blockchain
  console.log("\n=== Validating Blockchain ===");
  const { data: blocks } = await supabase
    .from("blockchain")
    .select("*")
    .order("id", { ascending: true });
  let valid = true;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const computed = computeBlockHash(b);
    if (b.hash !== computed) {
      console.error("FAIL block", b.id, "- hash mismatch");
      console.error("  expected:", computed);
      console.error("  got:     ", b.hash);
      valid = false;
    }
    if (i > 0 && b.previous_hash !== blocks[i - 1].hash) {
      console.error("FAIL block", b.id, "- chain break");
      valid = false;
    }
  }
  console.log(
    "Blockchain:",
    valid ? "VALID" : "BROKEN",
    "(" + blocks.length + " blocks)"
  );

  // 6. Final counts
  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });
  const { count: txCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  const { count: appCount } = await supabase
    .from("approvals")
    .select("*", { count: "exact", head: true });
  console.log(
    "\nFinal totals — Docs:",
    docCount,
    "| Txns:",
    txCount,
    "| Approvals:",
    appCount,
    "| Blocks:",
    blocks.length
  );
})();
