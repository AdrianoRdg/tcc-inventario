import { Address4 } from 'ip-address';

/**
 * Valida se um bloco CIDR filho está estritamente contido dentro de um bloco pai.
 */
export function isSubnetInsideParent(childCidr: string, parentCidr: string): boolean {
  try {
    const child = new Address4(childCidr);
    const parent = new Address4(parentCidr);

    // Regra 1: A máscara da rede filha não pode ser mais abrangente que a do pai.
    // Exemplo: Não posso colocar um /20 dentro de um /22.
    if (child.subnetMask < parent.subnetMask) {
      return false;
    }

    // Regra 2: O endereço inicial da rede filha precisa estar dentro do escopo do pai.
    // Com a biblioteca, usamos isInSubnet().
    return child.isInSubnet(parent);

  } catch (error) {
    // Se a string não for um CIDR válido (ex: "10.10.x.0/24"), cai aqui.
    return false;
  }
}