import type { WorkOrderPacket } from '../types';

export const mockWorkOrders: WorkOrderPacket[] = [
  {
    id: 'wo-gas-123',
    workOrderNumber: 'GAS-MAIN-2024-001',
    task: 'Gas Main Replacement',
    location: 'Corner of 5th Ave & Elm St',
    billOfMaterials: [
      { itemId: 'GASPIPE-HDPE-4IN', description: '4" HDPE Gas Pipe, 200ft', quantity: 1 },
      { itemId: 'VALVE-GAS-4IN-PE', description: '4" PE Ball Valve', quantity: 2 },
      { itemId: 'FITTING-TEE-4IN', description: '4" Electrofusion Tee', quantity: 1 },
    ],
    safetyChecklist: [
      { id: 'gas-check-1', prompt: 'Site safety briefing complete?', completed: false },
      { id: 'gas-check-2', prompt: 'Gas detectors calibrated and active?', completed: false },
      { id: 'gas-check-3', prompt: 'Excavation area marked and clear?', completed: false },
    ],
  },
  {
    id: 'wo-elec-456',
    workOrderNumber: 'ELEC-TR-2024-002',
    task: 'Transformer Replacement',
    location: '1234 Powerline Rd',
    billOfMaterials: [
      { itemId: 'XFMR-PAD-50KVA', description: '50kVA Pad-Mounted Transformer', quantity: 1 },
      { itemId: 'CABLE-PRI-15KV', description: '15kV Primary Cable, 50ft', quantity: 1 },
      { itemId: 'CONNECTOR-LUG-AL', description: 'Aluminum Lug Connector', quantity: 4 },
    ],
    safetyChecklist: [
        { id: 'elec-check-1', prompt: 'Lock-out/Tag-out procedures followed?', completed: false },
        { id: 'elec-check-2', prompt: 'Arc-flash PPE inspected and worn?', completed: false },
        { id: 'elec-check-3', prompt: 'Grounding equipment in place?', completed: false },
    ],
  },
   {
    id: 'wo-water-789',
    workOrderNumber: 'WATER-SVC-2024-003',
    task: 'New Water Service Installation',
    location: '789 Aqua Ln',
    billOfMaterials: [
      { itemId: 'PIPE-COPPER-1IN', description: '1" Copper Pipe, 50ft', quantity: 1 },
      { itemId: 'METER-WATER-5/8', description: '5/8" Water Meter', quantity: 1 },
    ],
    safetyChecklist: [
        { id: 'water-check-1', prompt: 'Confined space entry plan reviewed?', completed: false },
        { id: 'water-check-2', prompt: 'Shoring for trench inspected?', completed: false },
    ],
  }
];