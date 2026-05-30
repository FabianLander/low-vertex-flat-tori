import java.util.Arrays;

/**This class lets you do some debugging*/

public class Debugger {


    public static void debug(Manager M,int k) {
	if(k==0) debug0(M);
	if(k==1) debug1(M);
	if(k==2) getConvexLinks(M);
	if(k==3) testCycleFilter(M);
	if(k==4) testCycleAbsolute(M);
	if(k==5) debug5(M);
    }


    public static void debug0(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	System.out.println("absolute pattern number");
	System.out.println("internal edges");
	int[][] edge=LinkAnalyzer.internalEdges(k);
	for(int i=0;i<6;++i) ListHelp.printout(edge[i]);
    }


    public static void debug1(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	System.out.println("absolute pattern number");
	System.out.println("internal faces");
	int[][] face=LinkAnalyzer.internalFaces(k);
	for(int i=0;i<face.length;++i) ListHelp.printout(face[i]);
    }


    public static void getConvexLinks(Manager M) {
	System.out.println("--------------convex link list---------------");
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
       	int[][] edge=LinkAnalyzer.internalEdges(k);
	System.out.println("convex links");
	for(int i=0;i<7;++i) {
	    int[] link=LinkAnalyzer.convexLink(edge,i);
	    System.out.print(i+": ");
	    ListHelp.printout(link);
	}
	System.out.println("-------------------------------------------");
	    
    }


    public static void testCycleFilter(Manager M) {
	System.out.println("--------------filtered cycle test---------------");
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	int[] filter=new int[7];
	for(int i=0;i<7;++i) filter[i]=M.C.FILTER.L[i].on;
	testCycle(filter,k);
	System.out.println("-------------------------------------------");
    }


    public static void testCycleAbsolute(Manager M) {
	System.out.println("--------------absolute cycle test---------------");
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	int[] filter={1,1,1,1,1,1,1};
	testCycle(filter,k);
	System.out.println("-------------------------------------------");
    }

    

    public static void debug4(Manager M) {
	int[] a={1,2,3,4,5};
	for(int i=0;i<10;++i) {
	    int[] b=ListHelp.perDihedral(a,i);
	    ListHelp.printout(b);
	}
    }
    

    public static void debug5(Manager M) {
	int[] a={1,2,3,4,5};
	for(int i=0;i<10;++i) {
	    int[] b=ListHelp.perDihedral(a,i);
	    ListHelp.printout(b);
	}
    }
    

    
    /**This is a mirror of the routine in LinkAnalyzer.java, except that it
       returns the indices of all places where the cycle test fails*/

    public static void testCycle(int[] filter, int k) {
	boolean pass=true;
	for(int i=0;i<7;++i) {
  	    int[] cyc=LinkAnalyzer.getViableCycle(k,i);
	    System.out.println("viable cycles for "+i);
	    if(cyc!=null) ListHelp.printout(cyc);
	    if(filter[i]==0) System.out.println("not tested");
	    if((filter[i]==1)&&(cyc==null)) pass=false;
	}
	System.out.println("cycle test "+pass);
    }

}
