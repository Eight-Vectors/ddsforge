import type { TypeDefinition } from "../components/TypesEditor";

export function typeDefinitionsToTypesXml(types: TypeDefinition[] | undefined) {
  if (!types || types.length === 0) return undefined;

  const toMemberAttrs = (m: NonNullable<TypeDefinition["member"]>[number]) => {
    const attrs: any = {
      "@_name": m.name,
    };
    if (m.type) attrs["@_type"] = m.type;
    if (m.nonBasicTypeName) attrs["@_nonBasicTypeName"] = m.nonBasicTypeName;
    if (m.arrayDimensions) attrs["@_arrayDimensions"] = m.arrayDimensions;
    if (m.sequenceMaxLength !== undefined && m.sequenceMaxLength !== "") {
      attrs["@_sequenceMaxLength"] = m.sequenceMaxLength;
    }
    if (m.key_type) attrs["@_key_type"] = m.key_type;
    if (m.mapMaxLength !== undefined && m.mapMaxLength !== "") {
      attrs["@_mapMaxLength"] = m.mapMaxLength;
    }
    if (m.key === true) attrs["@_key"] = true;
    if (
      (m.type === "string" || m.type === "wstring") &&
      m.stringMaxLength !== undefined &&
      m.stringMaxLength !== ""
    ) {
      attrs["@_stringMaxLength"] = m.stringMaxLength;
    }
    return attrs;
  };

  const convert = (t: TypeDefinition) => {
    switch (t.kind) {
      case "struct": {
        const structObj: any = {
          "@_name": t.name,
        };
        if (t.baseType) structObj["@_baseType"] = t.baseType;
        if (t.member && t.member.length > 0) {
          structObj.member = t.member.map((m) => toMemberAttrs(m));
        }
        return { struct: structObj };
      }
      case "enum": {
        const enumObj: any = {
          "@_name": t.name,
        };
        if (t.enumerator && t.enumerator.length > 0) {
          enumObj.enumerator = t.enumerator.map((e) => {
            const ev: any = { "@_name": e.name };
            if (e.value !== undefined) ev["@_value"] = e.value;
            return ev;
          });
        }
        return { enum: enumObj };
      }
      case "bitmask": {
        const bitmaskObj: any = {
          "@_name": t.name,
        };
        if (t.bit_bound !== undefined) bitmaskObj["@_bit_bound"] = t.bit_bound;
        if (t.bit_value && t.bit_value.length > 0) {
          bitmaskObj.bit_value = t.bit_value.map((bv) => {
            const bvo: any = { "@_name": bv.name };
            if (bv.position !== undefined) bvo["@_position"] = bv.position;
            return bvo;
          });
        }
        return { bitmask: bitmaskObj };
      }
      case "typedef": {
        const typedefObj: any = {
          "@_name": t.name,
        };
        if (t.type) typedefObj["@_type"] = t.type;
        if (t.nonBasicTypeName) typedefObj["@_nonBasicTypeName"] = t.nonBasicTypeName;
        return { typedef: typedefObj };
      }
      case "union": {
        const unionObj: any = {
          "@_name": t.name,
        };
        if (t.discriminator && t.discriminator.type) {
          unionObj.discriminator = { "@_type": t.discriminator.type };
        }
        if (t.case && t.case.length > 0) {
          unionObj.case = t.case.map((c) => {
            const caseObj: any = {};
            if (c.caseDiscriminator && c.caseDiscriminator.length > 0) {
              caseObj.caseDiscriminator = c.caseDiscriminator.map((cd) => ({
                "@_value": cd.value,
              }));
            }
            if (c.member) {
              const mv: any = { "@_name": c.member.name };
              if (c.member.type) mv["@_type"] = c.member.type;
              if (c.member.nonBasicTypeName)
                mv["@_nonBasicTypeName"] = c.member.nonBasicTypeName;
              caseObj.member = mv;
            }
            return caseObj;
          });
        }
        return { union: unionObj };
      }
      case "bitset": {
        const bitsetObj: any = {
          "@_name": t.name,
        };
        if (t.baseType) bitsetObj["@_baseType"] = t.baseType;
        if (t.bitfield && t.bitfield.length > 0) {
          bitsetObj.bitfield = t.bitfield.map((bf) => {
            const bfo: any = { "@_bit_bound": bf.bit_bound };
            if (bf.name) bfo["@_name"] = bf.name;
            if (bf.type) bfo["@_type"] = bf.type;
            return bfo;
          });
        }
        return { bitset: bitsetObj };
      }
      default: {
        // Fallback to struct-like with name only
        return { struct: { "@_name": t.name } };
      }
    }
  };

  return {
    type: types.map(convert),
  };
}

export function parseTypesFromObject(typesObj: any): TypeDefinition[] {
  if (!typesObj) return [];
  const typeArray = Array.isArray(typesObj.type) ? typesObj.type : typesObj.type ? [typesObj.type] : [];

  const toStringArray = (maybeArray: any) => (Array.isArray(maybeArray) ? maybeArray : maybeArray !== undefined ? [maybeArray] : []);

  const parsed: TypeDefinition[] = typeArray.map((t: any) => {
    if (t.struct) {
      const s = t.struct;
      const members = toStringArray(s.member).map((m: any) => ({
        name: m?.["@_name"] ?? m?.name ?? "",
        type: m?.["@_type"] ?? m?.type ?? "int32",
        nonBasicTypeName: m?.["@_nonBasicTypeName"] ?? m?.nonBasicTypeName,
        arrayDimensions: m?.["@_arrayDimensions"] ?? m?.arrayDimensions,
        sequenceMaxLength: m?.["@_sequenceMaxLength"] ?? m?.sequenceMaxLength,
        key_type: m?.["@_key_type"] ?? m?.key_type,
        mapMaxLength: m?.["@_mapMaxLength"] ?? m?.mapMaxLength,
        key: m?.["@_key"] ?? m?.key ?? false,
        stringMaxLength: m?.["@_stringMaxLength"] ?? m?.stringMaxLength,
      }));
      return {
        kind: "struct",
        name: s?.["@_name"] ?? s?.name ?? "UnnamedType",
        baseType: s?.["@_baseType"] ?? s?.baseType,
        member: members,
      };
    }
    if (t.enum) {
      const e = t.enum;
      const enumerators = toStringArray(e.enumerator).map((en: any) => ({
        name: en?.["@_name"] ?? en?.name ?? "",
        value: en?.["@_value"] ?? en?.value,
      }));
      return {
        kind: "enum",
        name: e?.["@_name"] ?? e?.name ?? "UnnamedEnum",
        enumerator: enumerators,
      };
    }
    if (t.bitmask) {
      const b = t.bitmask;
      const bitValues = toStringArray(b.bit_value).map((bv: any) => ({
        name: bv?.["@_name"] ?? bv?.name ?? "",
        position: bv?.["@_position"] ?? bv?.position,
      }));
      return {
        kind: "bitmask",
        name: b?.["@_name"] ?? b?.name ?? "UnnamedBitmask",
        bit_bound: b?.["@_bit_bound"] ?? b?.bit_bound,
        bit_value: bitValues,
      };
    }
    if (t.typedef) {
      const td = t.typedef;
      return {
        kind: "typedef",
        name: td?.["@_name"] ?? td?.name ?? "UnnamedAlias",
        type: td?.["@_type"] ?? td?.type ?? "int32",
        nonBasicTypeName: td?.["@_nonBasicTypeName"] ?? td?.nonBasicTypeName,
      } as any;
    }
    if (t.union) {
      const u = t.union;
      const cases = toStringArray(u.case).map((c: any) => ({
        caseDiscriminator: toStringArray(c.caseDiscriminator).map((cd: any) => ({
          value: cd?.["@_value"] ?? cd?.value,
        })),
        member: {
          name: c.member?.["@_name"] ?? c.member?.name ?? "",
          type: c.member?.["@_type"] ?? c.member?.type ?? "int32",
          nonBasicTypeName:
            c.member?.["@_nonBasicTypeName"] ?? c.member?.nonBasicTypeName,
        },
      }));
      return {
        kind: "union",
        name: u?.["@_name"] ?? u?.name ?? "UnnamedUnion",
        discriminator: { type: u.discriminator?.["@_type"] ?? u.discriminator?.type ?? "int32" },
        case: cases,
      } as any;
    }
    if (t.bitset) {
      const bs = t.bitset;
      const bitfields = toStringArray(bs.bitfield).map((bf: any) => ({
        name: bf?.["@_name"] ?? bf?.name,
        bit_bound: bf?.["@_bit_bound"] ?? bf?.bit_bound ?? 1,
        type: bf?.["@_type"] ?? bf?.type,
      }));
      return {
        kind: "bitset",
        name: bs?.["@_name"] ?? bs?.name ?? "UnnamedBitset",
        baseType: bs?.["@_baseType"] ?? bs?.baseType,
        bitfield: bitfields,
      } as any;
    }

    // Fallback: use simple attributes if provided
    return {
      kind: (t.kind as TypeDefinition["kind"]) || "struct",
      name: t?.["@_name"] ?? t?.name ?? "UnnamedType",
    } as TypeDefinition;
  });

  return parsed;
} 