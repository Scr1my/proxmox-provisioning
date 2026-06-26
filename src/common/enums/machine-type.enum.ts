export enum MachineType {
    LXC = 'lxc',
    VM = 'qemu'
}

export function toMachineType(raw: string): MachineType {
    const map: Record<string, MachineType> = {
        'LXC': MachineType.LXC,
        'VM': MachineType.VM,
    };
    if (!map[raw]) throw new Error(`Unsupported machine type: ${raw}`);
    return map[raw];
}