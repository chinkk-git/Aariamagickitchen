# Notification privacy notice — publication draft, not yet approved

> Status: draft for the app owner and privacy counsel. Do not publish this notice or enable push until the bracketed controller/contact/retention fields and consent process are settled.

## English (UK)

Aaria's Magical Kitchen can send optional, occasional notices about new recipes, countries, accessibility features and important app updates. Push is off by default. We do not use advertising, behavioural profiling or location tracking for notifications.

If a parent or legal guardian approves push for a child and the child’s device user enables it, the service stores:

- the browser’s push endpoint and encryption keys, so the browser can receive a message;
- the language and selected announcement categories;
- a hash of a signed guardian-consent receipt, to confirm that an approved consent service authorized the subscription;
- a hash of an opaque guardian account identifier, a random device identifier, a guardian-assigned device label (do not use a child’s name), platform class and notification permission/subscription status;
- consent expiry, device last-contact time, subscription creation/update time, most recent test-send time for rate limiting, the first-notification outcome reported by the guardian, and aggregate delivery status.

The service does not ask for the child’s name, age, email address or location. The browser and its push service (for example, the platform’s browser notification service) process the endpoint and deliver the message. The hosting/provider infrastructure may process connection and security metadata under its own terms; the controller must identify those providers and update this notice before launch.

Subscriptions are kept until the user disables notifications, the parent withdraws consent, the browser reports that a subscription is invalid, or the approved retention period expires. Invalid endpoints are deleted after a delivery failure. The controller must set and publish a precise retention period for inactive subscriptions and consent records before launch. Announcement delivery history contains release identifiers and aggregate counts, not child profiles.

Push can be disabled in Aaria’s settings or in the device/browser notification settings. If push is disabled, the subscription should be deleted from the service. Parents/guardians and children can contact **[controller contact]** to ask questions or exercise applicable rights. **[Controller legal name and jurisdiction-specific rights/contact details must be completed before publication.]**

## Português (Brasil)

A Cozinha Mágica da Aaria pode enviar avisos opcionais e ocasionais sobre novas receitas, países, recursos de acessibilidade e atualizações importantes do aplicativo. As notificações ficam desativadas por padrão. Não usamos publicidade, perfil comportamental ou rastreamento de localização para notificações.

Se um pai, uma mãe ou responsável legal autorizar as notificações para uma criança e a pessoa usuária ativá-las no dispositivo, o serviço armazenará:

- o endereço de push do navegador e as chaves de criptografia necessárias para entregar mensagens;
- o idioma e as categorias de avisos selecionadas;
- um hash de um comprovante assinado de consentimento do responsável, para confirmar que um serviço de consentimento aprovado autorizou a assinatura;
- um hash de um identificador opaco do responsável, um identificador aleatório do dispositivo, um nome curto atribuído pelo responsável (não use o nome da criança), a classe da plataforma e o status da permissão/assinatura;
- o vencimento do consentimento, o último contato do dispositivo, as datas de criação/atualização da assinatura, a data do teste mais recente para limitar a frequência, o resultado da primeira notificação informado pelo responsável e o status agregado de entrega.

O serviço não solicita nome, idade, e-mail ou localização da criança. O navegador e o serviço de push da plataforma processam o endereço e entregam a mensagem. A infraestrutura de hospedagem e dos provedores pode processar metadados de conexão e segurança segundo seus próprios termos; o controlador deve identificar esses provedores e atualizar este aviso antes do lançamento.

As assinaturas serão mantidas até que a pessoa usuária desative as notificações, o responsável retire o consentimento, o navegador informe que a assinatura é inválida ou termine o prazo de retenção aprovado. Endereços inválidos serão excluídos após falha de entrega. O controlador deve definir e publicar um prazo preciso para assinaturas inativas e comprovantes de consentimento antes do lançamento. O histórico de entrega contém identificadores de versão e contagens agregadas, sem perfis de crianças.

As notificações podem ser desativadas nas configurações da Aaria ou nas configurações de notificações do dispositivo/navegador. Ao desativar, a assinatura deve ser apagada do serviço. Pais, mães, responsáveis e crianças podem contatar **[contato do controlador]** para esclarecer dúvidas ou exercer direitos aplicáveis. **[Nome legal do controlador, jurisdição e contatos/direitos devem ser preenchidos antes da publicação.]**

## Privacy review notes

- Brazil’s LGPD Article 14 says children’s personal data must be processed in their best interests; §1 requires specific, prominent consent from at least one parent/legal guardian for children, and §5 says reasonable efforts should verify who gave consent. ANPD Enunciado 1/2023 states other legal bases can apply to children/adolescents if best interests prevail; it does not remove the need to assess the actual processing and statutory requirements. Confirm the applicable legal basis and consent design for this exact service.
- The UK ICO Children’s Code says non-essential push notifications should be off by default for children. Its guidance recommends meaningful parent/guardian-child interaction and says tick-box-only consent controls may be inadequate in context. Confirm which jurisdictions and audience protections apply.
- The current signed-receipt verifier is only an API gate. No receipt issuer or verification vendor is selected, and the client subscription flow is disabled. The verifier must not be presented as proof of legal compliance until the consent method is reviewed.
- Identify the data controller, processor/subprocessor roles, push-service providers, international transfers, contact for rights requests, exact retention periods, deletion workflow, security incident route, and privacy notice URL.
- Complete a child-focused privacy impact assessment and verify that announcement frequency, message wording, controls and defaults serve children’s best interests.
- No feature should collect or use notification opens or clicks for profiling, analytics or targeting.
