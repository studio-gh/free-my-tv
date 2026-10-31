# TV Studio · Home layout

## Produto e hierarquia

A primeira tela é um painel doméstico, não uma vitrine de streaming. A primeira viewport prioriza a foto ambiente, a saudação “Bom dia.”, relógio, clima, modos de ambiente e agenda familiar. Filmes e séries só aparecem depois de pressionar Down.

## Home nativa atualmente implementada

- Fundo fotográfico usa imagens importadas localmente para o app. A seleção ainda não corresponde a álbuns Google Photos separados por modo.
- Os quatro seletores de ambiente permanecem compactos e icon-only. Nesta versão usam glifos provisórios já empacotados; os glifos finais de Família (três pessoas incluindo uma criança), Visitas (oito pessoas assimétricas), Viagem (avião) e Arte (quadro) dependem da geração e inclusão dos novos PNGs no catálogo do app.
- Agenda Guiga e Rê usa o feed compartilhado `https://painel-casa.pages.dev/api/tv/agenda`.
- Não há integração persistente de recados nesta versão. A Home não deve mostrar recados fictícios ou texto que sugira que existe uma caixa de mensagens funcional.
- A navegação nativa expõe somente Início, Apps e Configurações, que possuem ações implementadas. Não exibir Calendário, Recados, Clima, Filmes & Séries ou Descanso como destinos até que cada página tenha implementação real.

## Itens ainda não entregues

- Google Photos OAuth/API e seleção de álbum por modo.
- Ícones finais: Família (três pessoas incluindo uma criança), Visitas (oito pessoas assimétricas), Viagem (avião), Arte (quadro).
- Recados compartilhados com persistência e página dedicada.
- Páginas dedicadas de calendário, clima, fotos/ambientes e descanso.
- QR Wi-Fi funcional no modo Visitas e integração Spotify Connect/Cast para TV/Google Nest.
- Teste visual e navegação de ponta a ponta no Philips 65PUG7406/78 com Android TV 11.

## Direção visual

Manter fundo `#2c2c2c`, texto `#fffcf4`, accent `#ff961A`, granulação discreta de aproximadamente 5%, sombras suaves e legibilidade a distância. Navegação e foco devem responder localmente ao controle remoto.
