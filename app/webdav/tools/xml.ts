import { XMLBuilder, XMLParser } from 'fast-xml-parser';

interface NamespaceObject {
    [key: string]: any;
}

export function generateLockXML(ownerHREF: string): string {
    return getBuilder().build(
        namespace(
            {
                lockinfo: {
                    '@_xmlns:d': 'DAV:',
                    lockscope: {
                        exclusive: {}
                    },
                    locktype: {
                        write: {}
                    },
                    owner: {
                        href: ownerHREF
                    }
                }
            },
            'd'
        )
    );
}

function getBuilder(): XMLBuilder {
    return new XMLBuilder({
        attributeNamePrefix: '@_',
        format: true,
        ignoreAttributes: false,
        suppressEmptyNode: true
    });
}

function getParser(): XMLParser {
    return new XMLParser({
        removeNSPrefix: true,
        parseAttributeValue: true,
        parseTagValue: true
    });
}

function namespace<T extends NamespaceObject>(obj: T, ns: string): T {
    const copy = { ...obj };
    for (const key in copy) {
        if (!copy.hasOwnProperty(key)) {
            continue;
        }
        if (copy[key] && typeof copy[key] === 'object' && key.indexOf(':') === -1) {
            (copy as NamespaceObject)[`${ns}:${key}`] = namespace(copy[key], ns);
            delete copy[key];
        } else if (/^@_/.test(key) === false) {
            (copy as NamespaceObject)[`${ns}:${key}`] = copy[key];
            delete copy[key];
        }
    }
    return copy;
}

export function parseGenericResponse(xml: string): object {
    return getParser().parse(xml);
}
