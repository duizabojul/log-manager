import logsGeneratorRouter from './logsGeneratorRouter'
import consolidatorRouter from './consolidatorRouter'

export default [
  {
    baseRoute : '/logs-generator',
    router : logsGeneratorRouter
  },
  {
    baseRoute : '/consolidator',
    router : consolidatorRouter
  },
]